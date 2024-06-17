use serialport::{available_ports, SerialPortInfo};

#[tauri::command]
pub fn list_connected_arduinos() -> Result<Vec<SerialPortInfo>, String> {
    let available_ports = available_ports().map_err(|err| format!("{err:?}"))?;

    let connected_arduinos: Vec<SerialPortInfo> = available_ports
        .into_iter()
        .filter(|port| match &port.port_type {
            serialport::SerialPortType::UsbPort(usb_port) => match &usb_port.product {
                Some(product) => product.contains("Arduino"),
                _ => false,
            },
            _ => false,
        })
        .collect();

    Ok(connected_arduinos)
}
