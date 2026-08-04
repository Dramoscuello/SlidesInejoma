use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    extract::State,
    response::IntoResponse,
};
use futures_util::{sink::SinkExt, stream::StreamExt};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::broadcast;
use crate::models::WsEvent;

type RoomTx = broadcast::Sender<WsEvent>;

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
    let mut room_rx: Option<broadcast::Receiver<WsEvent>> = None;

    loop {
        tokio::select! {
            // 1. Transmit events from room broadcast channel -> WebSocket client
            Ok(event) = async {
                match room_rx {
                    Some(ref mut rx) => rx.recv().await,
                    None => futures_util::future::pending().await,
                }
            } => {
                if let Ok(json_text) = serde_json::to_string(&event) {
                    if ws_sender.send(Message::Text(json_text)).await.is_err() {
                        break;
                    }
                }
            }

            // 2. Receive events from WebSocket client -> broadcast to room
            msg = ws_receiver.next() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        if let Ok(event) = serde_json::from_str::<WsEvent>(&text) {
                            match event {
                                WsEvent::JoinSession { ref code, role: _ } => {
                                    let room_code = code.to_uppercase();
                                    current_code = Some(room_code.clone());

                                    let (tx, rx) = {
                                        let mut rooms = state.rooms.lock().unwrap();
                                        let tx = rooms
                                            .entry(room_code.clone())
                                            .or_insert_with(|| broadcast::channel(100).0)
                                            .clone();
                                        let rx = tx.subscribe();
                                        (tx, rx)
                                    };

                                    room_rx = Some(rx);

                                    let count = {
                                        let mut spectators = state.spectators.lock().unwrap();
                                        let c = spectators.entry(room_code.clone()).or_insert(0);
                                        *c += 1;
                                        *c
                                    };

                                    let _ = tx.send(WsEvent::SpectatorCount { count });
                                }
                                WsEvent::ChangeSlide { slide_index } => {
                                    if let Some(ref code) = current_code {
                                        let rooms = state.rooms.lock().unwrap();
                                        if let Some(tx) = rooms.get(code) {
                                            let _ = tx.send(WsEvent::ChangeSlide { slide_index });
                                        }
                                    }
                                }
                                WsEvent::PointerMove { x, y } => {
                                    if let Some(ref code) = current_code {
                                        let rooms = state.rooms.lock().unwrap();
                                        if let Some(tx) = rooms.get(code) {
                                            let _ = tx.send(WsEvent::PointerMove { x, y });
                                        }
                                    }
                                }
                                WsEvent::DrawStroke { points, color, width } => {
                                    if let Some(ref code) = current_code {
                                        let rooms = state.rooms.lock().unwrap();
                                        if let Some(tx) = rooms.get(code) {
                                            let _ = tx.send(WsEvent::DrawStroke { points, color, width });
                                        }
                                    }
                                }
                                WsEvent::ClearCanvas => {
                                    if let Some(ref code) = current_code {
                                        let rooms = state.rooms.lock().unwrap();
                                        if let Some(tx) = rooms.get(code) {
                                            let _ = tx.send(WsEvent::ClearCanvas);
                                        }
                                    }
                                }
                                WsEvent::EndSession => {
                                    if let Some(ref code) = current_code {
                                        let rooms = state.rooms.lock().unwrap();
                                        if let Some(tx) = rooms.get(code) {
                                            let _ = tx.send(WsEvent::EndSession);
                                        }
                                    }
                                }
                                _ => {}
                            }
                        }
                    }
                    _ => break, // Client disconnected or error
                }
            }
        }
    }

    // Handle Client Disconnect
    if let Some(code) = current_code {
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
            let _ = tx.send(WsEvent::SpectatorCount { count });
        }
    }
}
