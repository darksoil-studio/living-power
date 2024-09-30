use std::{collections::BTreeMap, fs::read_to_string, path::PathBuf};

use living_power_integrity::Measurement;

use crate::collect_measurements::parse_csv_file_contents;

#[tauri::command]
pub fn list_measurements_sdcards() -> Result<BTreeMap<String, PathBuf>, String> {
    internal_list_measurements_sdcards().map_err(|err| err.to_string())
}
fn internal_list_measurements_sdcards() -> anyhow::Result<BTreeMap<String, PathBuf>> {
    let mountpaths = mountpoints::mountpaths()?;

    let measurements_sdcards: Vec<PathBuf> = mountpaths
        .into_iter()
        .filter(|mountpath| {
            mountpath.join("data.csv").exists() && mountpath.join("serial").exists()
        })
        .collect();

    let mut sdcards: BTreeMap<String, PathBuf> = BTreeMap::new();

    for sdcard in measurements_sdcards {
        let serial_number = read_to_string(sdcard.join("serial"))?.trim().to_string();
        sdcards.insert(serial_number, sdcard);
    }

    Ok(sdcards)
}

#[tauri::command]
pub async fn collect_measurements_from_sdcard(
    mountpoint: PathBuf,
) -> Result<Vec<Measurement>, String> {
    internal_collect_measurements_from_sdcard(mountpoint).map_err(|err| err.to_string())
}

fn internal_collect_measurements_from_sdcard(
    mountpoint: PathBuf,
) -> anyhow::Result<Vec<Measurement>> {
    let contents = std::fs::read_to_string(mountpoint.join("data.csv"))?;
    parse_csv_file_contents(contents.trim().to_string())
}
