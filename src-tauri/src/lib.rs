use holochain_types::prelude::AppBundle;
use lair_keystore::dependencies::sodoken::{BufRead, BufWrite};
use serialport::available_ports;
use std::path::PathBuf;
use std::{collections::HashMap, time::Duration};
use tauri::AppHandle;
use tauri_plugin_holochain::{HolochainExt, HolochainPluginConfig, WANNetworkConfig};

mod arduino;
mod collect_measurements;
mod sdcards;

const APP_ID: &'static str = "living-power";
const PRODUCTION_SIGNAL_URL: &'static str = "wss://signal.holo.host";
const PRODUCTION_BOOTSTRAP_URL: &'static str = "https://bootstrap.holo.host";

pub fn happ_bundle() -> AppBundle {
    let bytes = include_bytes!("../../workdir/living-power.happ");
    AppBundle::decode(bytes).expect("Failed to decode living-power happ")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Warn)
                .build(),
        )
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_holochain::init(
            vec_to_locked(vec![]).expect("Can't build passphrase"),
            HolochainPluginConfig::new(holochain_dir(), wan_network_config()),
        ))
        .invoke_handler(tauri::generate_handler![
            arduino::list_connected_arduinos,
            collect_measurements::collect_measurements,
            collect_measurements::get_last_measurement,
            sdcards::list_measurements_sdcards,
            sdcards::collect_measurements_from_sdcard
        ])
        .setup(|app| {
            #[cfg(not(mobile))]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;

            let handle = app.handle().clone();
            let result: anyhow::Result<()> = tauri::async_runtime::block_on(async move {
                setup(handle).await?;

                // After set up we can be sure our app is installed and up to date, so we can just open it
                app.holochain()?
                    .main_window_builder(
                        String::from("main"),
                        false,
                        Some(String::from("living-power")),
                        None,
                    )
                    .await?
                    .build()?;

                // Keep sending data to the arduinos so that they know they are still
                // connected to a computer and they don't go into deepSleep mode
                tauri::async_runtime::spawn(async move {
                    loop {
                        let baud_rate: u32 = 9600;

                        let Ok(ports) = available_ports() else {
                            continue;
                        };

                        for port in ports {
                            let Ok(mut port) = serialport::new(port.port_name, baud_rate).open()
                            else {
                                continue;
                            };

                            let mut write_buffer: Vec<u8> = vec![0; 1];
                            write_buffer[0] = b'p';

                            let n = 1; // How many bytes to write to serial port.

                            // Write to serial port
                            let Ok(_) = port.write(&write_buffer[..n]) else {
                                continue;
                            }; // blocks
                        }

                        std::thread::sleep(Duration::from_millis(50));
                    }
                });
                Ok(())
            });
            result?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Very simple setup for now:
// - On app start, list installed apps:
//   - If there are no apps installed, this is the first time the app is opened: install our hApp
//   - If there **are** apps:
//     - Check if it's necessary to update the coordinators for our hApp
//       - And do so if it is
//
// You can modify this function to suit your needs if they become more complex
async fn setup(handle: AppHandle) -> anyhow::Result<()> {
    let admin_ws = handle.holochain()?.admin_websocket().await?;

    let installed_apps = admin_ws
        .list_apps(None)
        .await
        .map_err(|err| tauri_plugin_holochain::Error::ConductorApiError(err))?;

    if installed_apps.len() == 0 {
        handle
            .holochain()?
            .install_app(
                String::from(APP_ID),
                happ_bundle(),
                HashMap::new(),
                None,
                None,
                None,
            )
            .await?;

        Ok(())
    } else {
        handle
            .holochain()?
            .update_app_if_necessary(String::from(APP_ID), happ_bundle())
            .await?;

        Ok(())
    }
}

fn wan_network_config() -> Option<WANNetworkConfig> {
    // Resolved at compile time to be able to point to local services
    if tauri::is_dev() {
        None
    } else {
        // Some(WANNetworkConfig {
        //     signal_url: url2::url2!("wss://signal.holo.host"),
        //     bootstrap_url: url2::url2!("https://bootstrap.holo.host")
        // })
        None
    }
}

fn holochain_dir() -> PathBuf {
    if tauri::is_dev() {
        let tmp_dir =
            tempdir::TempDir::new("living-power").expect("Could not create temporary directory");

        // Convert `tmp_dir` into a `Path`, destroying the `TempDir`
        // without deleting the directory.
        let tmp_path = tmp_dir.into_path();
        tmp_path
    } else {
        app_dirs2::app_root(
            app_dirs2::AppDataType::UserData,
            &app_dirs2::AppInfo {
                name: "living-power",
                author: std::env!("CARGO_PKG_AUTHORS"),
            },
        )
        .expect("Could not get app root")
        .join("holochain")
    }
}

fn vec_to_locked(mut pass_tmp: Vec<u8>) -> std::io::Result<BufRead> {
    match BufWrite::new_mem_locked(pass_tmp.len()) {
        Err(e) => {
            pass_tmp.fill(0);
            Err(e.into())
        }
        Ok(p) => {
            {
                let mut lock = p.write_lock();
                lock.copy_from_slice(&pass_tmp);
                pass_tmp.fill(0);
            }
            Ok(p.to_read())
        }
    }
}
