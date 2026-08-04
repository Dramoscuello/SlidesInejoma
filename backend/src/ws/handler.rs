use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    extract::State,
    response::IntoResponse,
};
use futures_util::{sink::SinkExt, stream::StreamExt};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::broadcast;
use crate::models::WsMessage;

type RoomTx = broadcast::Sender<WsMessage>;

#[derive(Clone, Default)]
pub struct WsState {
    rooms: Arc<Mutex<HashMap<String, RoomTx>>>,
    spectators: Arc<Mutex<HashMap<String, usize>>>,
}

impl WsState {
    pub fn new() -> Self {
        Self::default()
    }
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<WsState>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: WsState) {
    let (mut ws_sender, mut ws_receiver) = socket.split();
    let mut current_code: Option<String> = None;
    let mut is_student = false;
    let mut room_rx: Option<broadcast::Receiver<WsMessage>> = None;

    loop {
        tokio::select! {
            // 1. Transmit events from room broadcast channel -> WebSocket client
            Ok(msg) = async {
                match room_rx {
                    Some(ref mut rx) => rx.recv().await,
                    None => futures_util::future::pending().await,
                }
            } => {
                if let Ok(json_text) = serde_json::to_string(&msg) {
                    if ws_sender.send(Message::Text(json_text)).await.is_err() {
                        break;
                    }
                }
            }

            // 2. Receive events from WebSocket client -> broadcast to room
            incoming = ws_receiver.next() => {
                match incoming {
                    Some(Ok(Message::Text(text))) => {
                        if let Ok(ws_msg) = serde_json::from_str::<WsMessage>(&text) {
                            match ws_msg.msg_type.as_str() {
                                "JOIN_SESSION" => {
                                    let code = ws_msg.payload["code"]
                                        .as_str()
                                        .unwrap_or_default()
                                        .to_uppercase();
                                    let role = ws_msg.payload["role"]
                                        .as_str()
                                        .unwrap_or("student");

                                    if !code.is_empty() {
                                        current_code = Some(code.clone());
                                        if role == "student" {
                                            is_student = true;
                                        }

                                        let (tx, rx) = {
                                            let mut rooms = state.rooms.lock().unwrap();
                                            let tx = rooms
                                                .entry(code.clone())
                                                .or_insert_with(|| broadcast::channel(100).0)
                                                .clone();
                                            let rx = tx.subscribe();
                                            (tx, rx)
                                        };

                                        room_rx = Some(rx);

                                        if is_student {
                                            let count = {
                                                let mut spectators = state.spectators.lock().unwrap();
                                                let c = spectators.entry(code.clone()).or_insert(0);
                                                *c += 1;
                                                *c
                                            };

                                            let count_msg = WsMessage {
                                                msg_type: "SPECTATOR_COUNT".to_string(),
                                                payload: serde_json::json!({ "count": count }),
                                            };
                                            let _ = tx.send(count_msg);
                                        }
                                    }
                                }
                                _ => {
                                    // Broadcast all events (CHANGE_SLIDE, POINTER_MOVE, DRAW_STROKE, CLEAR_CANVAS, END_SESSION)
                                    if let Some(ref code) = current_code {
                                        let rooms = state.rooms.lock().unwrap();
                                        if let Some(tx) = rooms.get(code) {
                                            let _ = tx.send(ws_msg);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    _ => break, // Client disconnected or socket closed
                }
            }
        }
    }

    // Handle Client Disconnect
    if let (Some(code), true) = (current_code, is_student) {
        let count = {
            let mut spectators = state.spectators.lock().unwrap();
            let c = spectators.entry(code.clone()).or_insert(1);
            if *c > 0 {
                *c -= 1;
            }
            *c
        };

        let rooms = state.rooms.lock().unwrap();
        if let Some(tx) = rooms.get(&code) {
            let count_msg = WsMessage {
                msg_type: "SPECTATOR_COUNT".to_string(),
                payload: serde_json::json!({ "count": count }),
            };
            let _ = tx.send(count_msg);
        }
    }
}
