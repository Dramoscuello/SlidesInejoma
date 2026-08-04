use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    extract::State,
    response::IntoResponse,
};
use futures_util::stream::StreamExt;
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
    let (mut _sender, mut receiver) = socket.split();
    let mut current_code: Option<String> = None;
    let mut _rx_sub: Option<broadcast::Receiver<WsEvent>> = None;

    while let Some(Ok(msg)) = receiver.next().await {
        if let Message::Text(text) = msg {
            if let Ok(event) = serde_json::from_str::<WsEvent>(&text) {
                match event {
                    WsEvent::JoinSession { code, role: _ } => {
                        let room_code = code.to_uppercase();
                        current_code = Some(room_code.clone());

                        let tx = {
                            let mut rooms = state.rooms.lock().unwrap();
                            rooms
                                .entry(room_code.clone())
                                .or_insert_with(|| broadcast::channel(100).0)
                                .clone()
                        };

                        let count = {
                            let mut spectators = state.spectators.lock().unwrap();
                            let c = spectators.entry(room_code.clone()).or_insert(0);
                            *c += 1;
                            *c
                        };

                        _rx_sub = Some(tx.subscribe());

                        // Broadcast updated spectator count
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
