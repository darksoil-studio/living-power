use anyhow::anyhow;
use chrono::{NaiveDate, NaiveDateTime};
use holochain_types::prelude::Timestamp;
use living_power_integrity::measurement_collection::Measurement;
use once_cell::sync::Lazy;
use regex::Regex;
use std::time::Duration;

static MEASUREMENT_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
            r"(?<year>\d\d\d\d)-(?<month>\d\d)-(?<day>\d\d),(?<hours>\d\d):(?<minutes>\d\d):(?<seconds>\d\d),(?<temperature>[\d\.]+),(?<humidity>[\d\.]+),(?<lightlevel>[\d\.]+),(?<voltage>[\d\.]+)\s*$",
    ).unwrap()
});

#[tauri::command]
pub async fn get_last_measurement(port_name: String) -> Result<Option<Measurement>, String> {
    internal_get_last_measurement(port_name).map_err(|err| err.to_string())
}
fn internal_get_last_measurement(port_name: String) -> anyhow::Result<Option<Measurement>> {
    let baud_rate: u32 = 9600;

    let mut port = serialport::new(port_name, baud_rate)
        .timeout(Duration::from_millis(5000))
        .open()?;

    let mut write_buffer: Vec<u8> = vec![0; 1];
    write_buffer[0] = b'l';

    let n = 1; // How many bytes to write to serial port.

    // Write to serial port
    port.write(&write_buffer[..n])?; // blocks

    loop {
        let mut read_buffer: Vec<u8> = vec![0; 7];

        let _n = port.read(&mut read_buffer)?;
        let buf = String::from_utf8(read_buffer)?;
        if buf.contains("BEGIN_L") {
            break;
        } else {
            std::thread::sleep(Duration::from_millis(10));
        }
    }

    let mut result = String::from("");
    let mut end = false;
    while !end {
        let mut read_buffer: Vec<u8> = vec![0; 4096];

        let n = port.read(&mut read_buffer)?;
        let buf = String::from_utf8(read_buffer)?;
        if buf.contains("None") {
            return Ok(None);
        } else if buf.contains('\n') {
            end = true;
        }
        result.push_str(&buf[..n].trim());
    }

    let measurement = line_to_measurement(result.as_str())?;
    Ok(Some(measurement))
}

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
    port.write(&write_buffer[..n])?; // blocks

    loop {
        let mut read_buffer: Vec<u8> = vec![0; 7];

        let _n = port.read(&mut read_buffer)?;
        let buf = String::from_utf8(read_buffer)?;
        if buf.contains("BEGIN_C") {
            break;
        } else {
            std::thread::sleep(Duration::from_millis(10));
        }
    }

    let mut result = String::from("");

    let mut end = false;
    while !end {
        let mut read_buffer: Vec<u8> = vec![0; 4096];

        let n = port.read(&mut read_buffer)?;
        let buf = String::from_utf8(read_buffer)?;
        if buf.contains("EndOfFile") {
            end = true;
        }
        result.push_str(&buf[..n]);
    }

    parse_csv_file_contents(result)
}

pub fn parse_csv_file_contents(contents: String) -> anyhow::Result<Vec<Measurement>> {
    let split = contents.split('\n');

    let mut measurements: Vec<Measurement> = vec![];
    for line in split {
        // Check whether this line is the title row of the csv
        if !line.contains("Date") {
            match line_to_measurement(line) {
                Ok(measurement) => measurements.push(measurement),
                Err(err) => log::warn!("Error reading the measurement line \"{line}\": {err:?}"),
            };
        }
    }

    Ok(measurements)
}

fn line_to_measurement(line: &str) -> anyhow::Result<Measurement> {
    let Some(caps) = MEASUREMENT_REGEX.captures(line) else {
        return Err(anyhow!("Invalid measurement line"));
    };
    let date_time: NaiveDateTime = NaiveDate::from_ymd_opt(
        caps["year"].parse::<i32>()?,
        caps["month"].parse()?,
        caps["day"].parse()?,
    )
    .unwrap()
    .and_hms_opt(
        caps["hours"].parse()?,
        caps["minutes"].parse()?,
        caps["seconds"].parse()?,
    )
    .unwrap();
    let timestamp = Timestamp::from_micros(date_time.and_utc().timestamp_micros());

    let temperature: f32 = caps["temperature"].parse()?;
    let humidity: f32 = caps["humidity"].parse()?;
    let lightlevel: f32 = caps["lightlevel"].parse()?;
    let voltage: f32 = caps["voltage"].parse()?;

    let measurement = Measurement {
        timestamp,
        humidity_percentage: (humidity * 1000.0) as u32,
        temperature_celsius: (temperature * 1000.0) as u32,
        light_level_lux: (lightlevel * 1000.0) as u32,
        voltage_millivolts: (voltage * 1000.0) as u32,
    };
    Ok(measurement)
}
