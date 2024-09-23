use std::path::PathBuf;
use std::process::Command;
use std::{collections::HashMap, time::Duration};

use anyhow::anyhow;
use serialport::available_ports;
use tauri::utils::platform::current_exe;
use tauri::AppHandle;

use holochain_client::{AppStatusFilter, ZomeCallTarget};
use holochain_conductor_api::CellInfo;
use holochain_types::prelude::{AppBundle, ExternIO};
use lair_keystore::dependencies::sodoken::{BufRead, BufWrite};
use tauri_plugin_holochain::{HolochainExt, HolochainPluginConfig, WANNetworkConfig};
use tauri_plugin_log::Target;

mod arduino;
mod collect_measurements;
mod sdcards;

// const PRODUCTION_SIGNAL_URL: &'static str = "wss://signal.holo.host";
// const PRODUCTION_BOOTSTRAP_URL: &'static str = "https://bootstrap.holo.host";

const APP_ID_PREFIX: &'static str = "living-power";
const DNA_HASH: &'static str = include_str!("../../workdir/living_power_dna-hash");

fn app_id() -> String {
    format!("{APP_ID_PREFIX}-{}", DNA_HASH.trim())
}

pub fn happ_bundle() -> AppBundle {
    let bytes = include_bytes!("../../workdir/living-power.happ");
    AppBundle::decode(bytes).expect("Failed to decode living-power happ")
}

fn move_executable_to_app_directory() -> anyhow::Result<()> {
    if tauri::is_dev() {
        return Ok(());
    }
    let current_executable = current_exe()?;
    println!("Current executable: {current_executable:?}");
    let executable_name = current_executable.file_name().expect("Could not get filename").to_str().expect("Could not get filename");
    if !executable_name.ends_with(".app") {
        return Ok(());
    }

    if current_executable.starts_with("/Applications") {
        return Ok(());
    }

    std::fs::copy(current_executable.clone(), PathBuf::from("/Applications"))?;
    std::fs::remove_file(current_executable.clone())?;

    std::process::Command::new(format!("/Applications/{executable_name}"))
      .spawn()?;

    std::process::exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "macos")]
    if let Err(err) = move_executable_to_app_directory() {
        println!("Error moving the app to the /Applications directory: {err:?}");
    }

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Warn)
                .target(Target::new(tauri_plugin_log::TargetKind::LogDir {
                    file_name: None,
                }))
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
                    .main_window_builder(String::from("main"), false, Some(app_id()), None)
                    .await?
                    .title(String::from("Living Power"))
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
        .list_apps(Some(AppStatusFilter::Running))
        .await
        .map_err(|err| tauri_plugin_holochain::Error::ConductorApiError(err))?;

    let app_is_already_installed = installed_apps
        .iter()
        .find(|app| app.installed_app_id.as_str().eq(&app_id()))
        .is_some();

    if !app_is_already_installed {
        let previous_app = installed_apps
            .iter()
            .find(|app| app.installed_app_id.as_str().starts_with(APP_ID_PREFIX));

        let agent_key = previous_app.map(|app| app.agent_pub_key.clone());

        handle
            .holochain()?
            .install_app(
                String::from(app_id()),
                happ_bundle(),
                HashMap::new(),
                None,
                agent_key,
                None,
            )
            .await?;

        if let Some(previous_app) = previous_app {
            log::warn!("Migrating from old app {}", previous_app.installed_app_id);
            let Some(Some(CellInfo::Provisioned(previous_cell_info))) = previous_app
                .cell_info
                .get("living_power")
                .map(|c| c.first())
            else {
                log::error!(
                    "'living_power' cell was not found in previous app {}",
                    previous_app.installed_app_id
                );
                return Ok(());
            };

            let previous_cell_id = previous_cell_info.cell_id.clone();

            let app_ws = handle.holochain()?.app_websocket(app_id()).await?;
            let migration_result = app_ws
                .call_zome(
                    ZomeCallTarget::RoleName("living_power".into()),
                    "living_power".into(),
                    "migrate_from_old_cell".into(),
                    ExternIO::encode(previous_cell_id)?,
                )
                .await;

            if let Err(err) = migration_result {
                log::error!("Error migrating data from the previous version of the app: {err:?}",);
                return Ok(());
            }

            admin_ws
                .disable_app(previous_app.installed_app_id.clone())
                .await
                .map_err(|err| anyhow!("{err:?}"))?;
        }

        Ok(())
    } else {
        handle
            .holochain()?
            .update_app_if_necessary(String::from(app_id()), happ_bundle())
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
