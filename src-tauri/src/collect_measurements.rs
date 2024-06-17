use chrono::{NaiveDate, NaiveDateTime};
use holochain_types::prelude::Timestamp;
use living_power_integrity::measurement_collection::Measurement;
use regex::Regex;
use std::time::Duration;

#[tauri::command]
pub async fn collect_measurements(port_name: String) -> Result<Vec<Measurement>, String> {
    internal_collect_measurements(port_name).map_err(|err| err.to_string())
}

fn internal_collect_measurements(port_name: String) -> anyhow::Result<Vec<Measurement>> {
    let baud_rate: u32 = 9600;

    let mut port = serialport::new(port_name, baud_rate)
        .timeout(Duration::from_millis(50000))
        .open()?;

    let mut write_buffer: Vec<u8> = vec![0; 1];
    write_buffer[0] = b'c';

    let n = 1; // How many bytes to write to serial port.

    // Write to serial port
    port.write(&write_buffer[..n]) // blocks
        .unwrap();

    let mut measurements: Vec<Measurement> = vec![];
    let mut end = false;
    let re = Regex::new(
        r"(?<year>\d\d\d\d)-(?<month>\d\d)-(?<day>\d\d),(?<hours>\d\d)::(?<minutes>\d\d)::(?<seconds>\d\d),(?<temperature>[^,]+),(?<humidity>[^,]+),(?<lightlevel>[^,]+),(?<voltage>[^\r]+).*",
    )?;

    while !end {
        let mut read_buffer: Vec<u8> = vec![0; 128];

        let _n = port.read(&mut read_buffer)?;
        let line = String::from_utf8(read_buffer)?;

        if line.starts_with("EndOfFile") {
            end = true;
        } else {
            if let Some(caps) = re.captures(line.as_str()) {
                let date_time: NaiveDateTime = NaiveDate::from_ymd_opt(
                    caps["year"].parse().unwrap(),
                    caps["month"].parse().unwrap(),
                    caps["day"].parse().unwrap(),
                )
                .unwrap()
                .and_hms_opt(
                    caps["hours"].parse().unwrap(),
                    caps["minutes"].parse().unwrap(),
                    caps["seconds"].parse().unwrap(),
                )
                .unwrap();
                let timestamp = Timestamp::from_micros(date_time.and_utc().timestamp_micros());

                let temperature: f32 = caps["temperature"].parse()?;
                let humidity: f32 = caps["humidity"].parse()?;
                let lightlevel: f32 = caps["lightlevel"].parse()?;
                let voltage: f32 = caps["voltage"].parse()?;

                let measurement = Measurement {
                    timestamp,
                    humidity_percentage: humidity as u32 * 1000,
                    temperature_celsius: temperature as u32 * 1000,
                    light_level_lux: lightlevel as u32 * 1000,
                    voltage_millivolts: voltage as u32 * 1000,
                };
                measurements.push(measurement);
            }
        }
    }

    Ok(measurements)
}
