use hdk::prelude::*;
use serde::de::DeserializeOwned;

use living_power_integrity::*;

pub mod all_bpv_devices;
pub mod bpv_device;
pub mod external_resistors;
pub mod measurement_collection;
use bpv_device::{set_bpv_device_info, BpvDeviceInfo, SetBpvDeviceInfoInput};
use measurement_collection::create_measurement_collections;

#[hdk_extern]
pub fn init() -> ExternResult<InitCallbackResult> {
    Ok(InitCallbackResult::Pass)
}
#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
pub enum Signal {
    EntryCreated {
        action: SignedActionHashed,
        app_entry: EntryTypes,
    },
    EntryUpdated {
        action: SignedActionHashed,
        app_entry: EntryTypes,
        original_app_entry: EntryTypes,
    },
    EntryDeleted {
        action: SignedActionHashed,
        original_app_entry: EntryTypes,
    },
    LinkCreated {
        action: SignedActionHashed,
        link_type: LinkTypes,
    },
    LinkDeleted {
        action: SignedActionHashed,
        create_link_action: SignedActionHashed,
        link_type: LinkTypes,
    },
}

fn call_old_cell<P, R>(old_cell: CellId, fn_name: &str, payload: P) -> ExternResult<R>
where
    P: serde::Serialize + std::fmt::Debug,
    R: std::fmt::Debug + DeserializeOwned,
{
    let response = call(
        CallTargetCell::OtherCell(old_cell),
        "living_power",
        fn_name.into(),
        None,
        payload,
    )?;
    let ZomeCallResponse::Ok(result) = response else {
        return Err(wasm_error!(WasmErrorInner::Guest(format!(
            "Error calling old cell's zome function {fn_name}: {response:?}"
        ))));
    };

    let r: R = result.decode::<R>().map_err(|err| {
        wasm_error!(WasmErrorInner::Guest(format!(
            "Error decoding result from old cell's zome function {fn_name}: {err:?}"
        )))
    })?;

    Ok(r)
}

#[hdk_extern]
pub fn migrate_from_old_cell(old_cell: CellId) -> ExternResult<()> {
    // Get all the BPVs
    let links: Vec<Link> = call_old_cell(old_cell.clone(), "get_all_bpv_devices", ())?;

    let arduino_serial_numbers: Vec<String> = links
        .into_iter()
        .filter_map(|link| {
            Component::try_from(SerializedBytes::from(UnsafeBytes::from(
                link.tag.into_inner(),
            )))
            .ok()
        })
        .filter_map(|component| String::try_from(&component).ok())
        .collect();

    // For each BPV
    // - Get the BPV info, and commit it
    // - Get all measurements, and commit them
    for arduino_serial_number in arduino_serial_numbers {
        let mut links: Vec<Link> = call_old_cell(
            old_cell.clone(),
            "get_bpv_device_info",
            arduino_serial_number.clone(),
        )?;

        links.sort_by(|link_a, link_b| link_b.timestamp.cmp(&link_a.timestamp));

        if let Some(link) = links.first() {
            let bytes = SerializedBytes::from(UnsafeBytes::from(link.tag.clone().into_inner()));
            let info = BpvDeviceInfo::try_from(bytes).map_err(|err| {
                wasm_error!(WasmErrorInner::Guest(format!(
                    "Error decoding BpvDeviceInfo from link tag {err:?}"
                )))
            })?;

            set_bpv_device_info(SetBpvDeviceInfoInput {
                info,
                arduino_serial_number: arduino_serial_number.clone(),
            })?;
        }
        let links: Vec<Link> = call_old_cell(
            old_cell.clone(),
            "get_measurement_collections_for_bpv_device",
            arduino_serial_number.clone(),
        )?;
        let measurement_collections_actions_hashes: Vec<ActionHash> = links
            .into_iter()
            .filter_map(|link| link.target.into_action_hash())
            .collect();

        for measurement_collection_hash in measurement_collections_actions_hashes {
            let record: Record = call_old_cell(
                old_cell.clone(),
                "get_measurement_collection",
                measurement_collection_hash,
            )?;

            let Some(entry_hash) = record.signed_action().action().entry_hash() else {
                continue;
            };

            if let Some(_) = get(entry_hash.clone(), GetOptions::default())? {
                continue;
            }

            let Some(entry) = record.entry().as_option().cloned() else {
                continue;
            };

            let measurement_collection = MeasurementCollection::try_from(entry)?;

            create_measurement_collections(measurement_collection)?;
        }
    }

    Ok(())
}

#[hdk_extern(infallible)]
pub fn post_commit(committed_actions: Vec<SignedActionHashed>) {
    for action in committed_actions {
        if let Err(err) = signal_action(action) {
            error!("Error signaling new action: {:?}", err);
        }
    }
}
fn signal_action(action: SignedActionHashed) -> ExternResult<()> {
    match action.hashed.content.clone() {
        Action::Create(_create) => {
            if let Ok(Some(app_entry)) = get_entry_for_action(&action.hashed.hash) {
                emit_signal(Signal::EntryCreated { action, app_entry })?;
            }
            Ok(())
        }
        Action::Update(update) => {
            if let Ok(Some(app_entry)) = get_entry_for_action(&action.hashed.hash) {
                if let Ok(Some(original_app_entry)) =
                    get_entry_for_action(&update.original_action_address)
                {
                    emit_signal(Signal::EntryUpdated {
                        action,
                        app_entry,
                        original_app_entry,
                    })?;
                }
            }
            Ok(())
        }
        Action::Delete(delete) => {
            if let Ok(Some(original_app_entry)) = get_entry_for_action(&delete.deletes_address) {
                emit_signal(Signal::EntryDeleted {
                    action,
                    original_app_entry,
                })?;
            }
            Ok(())
        }
        Action::CreateLink(create_link) => {
            if let Ok(Some(link_type)) =
                LinkTypes::from_type(create_link.zome_index, create_link.link_type)
            {
                emit_signal(Signal::LinkCreated { action, link_type })?;
            }
            Ok(())
        }
        Action::DeleteLink(delete_link) => {
            let record = get(delete_link.link_add_address.clone(), GetOptions::default())?.ok_or(
                wasm_error!(WasmErrorInner::Guest(
                    "Failed to fetch CreateLink action".to_string()
                )),
            )?;
            match record.action() {
                Action::CreateLink(create_link) => {
                    if let Ok(Some(link_type)) =
                        LinkTypes::from_type(create_link.zome_index, create_link.link_type)
                    {
                        emit_signal(Signal::LinkDeleted {
                            action,
                            link_type,
                            create_link_action: record.signed_action.clone(),
                        })?;
                    }
                    Ok(())
                }
                _ => Err(wasm_error!(WasmErrorInner::Guest(
                    "Create Link should exist".to_string()
                ))),
            }
        }
        _ => Ok(()),
    }
}
fn get_entry_for_action(action_hash: &ActionHash) -> ExternResult<Option<EntryTypes>> {
    let record = match get_details(action_hash.clone(), GetOptions::default())? {
        Some(Details::Record(record_details)) => record_details.record,
        _ => {
            return Ok(None);
        }
    };
    let entry = match record.entry().as_option() {
        Some(entry) => entry,
        None => {
            return Ok(None);
        }
    };
    let (zome_index, entry_index) = match record.action().entry_type() {
        Some(EntryType::App(AppEntryDef {
            zome_index,
            entry_index,
            ..
        })) => (zome_index, entry_index),
        _ => {
            return Ok(None);
        }
    };
    EntryTypes::deserialize_from_type(*zome_index, *entry_index, entry)
}
