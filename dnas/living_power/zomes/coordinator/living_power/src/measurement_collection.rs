use hdk::prelude::*;
use living_power_integrity::*;

use crate::bpv_device::bpv_device_hash;

const BITS_PER_MEASUREMENT: usize = 39 + 64 + 32 + 32 + 32 + 32 + 32; // ActionHash + i64 + u32 + u32 + u32 + u32 + u32

#[hdk_extern]
pub fn create_measurement_collections(
    measurement_collection: MeasurementCollection,
) -> ExternResult<Vec<ActionHash>> {
    let mut hashes: Vec<ActionHash> = Vec::new();

    let chunks = measurement_collection
        .measurements
        .chunks(ENTRY_SIZE_LIMIT * 8 / BITS_PER_MEASUREMENT - 10);

    for chunk in chunks {
        let measurement_collection = MeasurementCollection {
            arduino_serial_number: measurement_collection.arduino_serial_number.clone(),
            external_resistor_ohms: measurement_collection.external_resistor_ohms,
            measurements: chunk.to_vec(),
        };
        let measurement_collection_hash = create_entry(&EntryTypes::MeasurementCollection(
            measurement_collection.clone(),
        ))?;

        create_link(
            bpv_device_hash(measurement_collection.arduino_serial_number.clone())?,
            measurement_collection_hash.clone(),
            LinkTypes::BpvDeviceToMeasurementCollections,
            (),
        )?;
        hashes.push(measurement_collection_hash);
    }

    Ok(hashes)
}

#[hdk_extern]
pub fn get_measurement_collection(
    measurement_collection_hash: ActionHash,
) -> ExternResult<Option<Record>> {
    let Some(details) = get_details(measurement_collection_hash, GetOptions::default())? else {
        return Ok(None);
    };
    match details {
        Details::Record(details) => Ok(Some(details.record)),
        _ => Err(wasm_error!(WasmErrorInner::Guest(
            "Malformed get details response".to_string()
        ))),
    }
}

#[hdk_extern]
pub fn delete_measurement_collection(
    original_measurement_collection_hash: ActionHash,
) -> ExternResult<ActionHash> {
    let details = get_details(
        original_measurement_collection_hash.clone(),
        GetOptions::default(),
    )?
    .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
        "{pascal_entry_def_name} not found"
    ))))?;
    let record = match details {
        Details::Record(details) => Ok(details.record),
        _ => Err(wasm_error!(WasmErrorInner::Guest(String::from(
            "Malformed get details response"
        )))),
    }?;
    let entry = record
        .entry()
        .as_option()
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "MeasurementCollection record has no entry".to_string()
        )))?;
    let measurement_collection = MeasurementCollection::try_from(entry)?;

    let links = get_links(
        GetLinksInputBuilder::try_new(
            bpv_device_hash(measurement_collection.arduino_serial_number.clone())?,
            LinkTypes::BpvDeviceToMeasurementCollections,
        )?
        .build(),
    )?;
    for link in links {
        if let Some(action_hash) = link.target.into_action_hash() {
            if action_hash.eq(&original_measurement_collection_hash) {
                delete_link(link.create_link_hash)?;
            }
        }
    }

    delete_entry(original_measurement_collection_hash)
}

#[hdk_extern]
pub fn get_all_deletes_for_measurement_collection(
    original_measurement_collection_hash: ActionHash,
) -> ExternResult<Option<Vec<SignedActionHashed>>> {
    let Some(details) = get_details(original_measurement_collection_hash, GetOptions::default())?
    else {
        return Ok(None);
    };

    match details {
        Details::Entry(_) => Err(wasm_error!(WasmErrorInner::Guest(
            "Malformed details".into()
        ))),
        Details::Record(record_details) => Ok(Some(record_details.deletes)),
    }
}

#[hdk_extern]
pub fn get_oldest_delete_for_measurement_collection(
    original_measurement_collection_hash: ActionHash,
) -> ExternResult<Option<SignedActionHashed>> {
    let Some(mut deletes) =
        get_all_deletes_for_measurement_collection(original_measurement_collection_hash)?
    else {
        return Ok(None);
    };

    deletes.sort_by(|delete_a, delete_b| {
        delete_a
            .action()
            .timestamp()
            .cmp(&delete_b.action().timestamp())
    });

    Ok(deletes.first().cloned())
}

#[hdk_extern]
pub fn get_measurement_collections_for_bpv_device(
    arduino_serial_number: String,
) -> ExternResult<Vec<Link>> {
    get_links(
        GetLinksInputBuilder::try_new(
            bpv_device_hash(arduino_serial_number)?,
            LinkTypes::BpvDeviceToMeasurementCollections,
        )?
        .build(),
    )
}

#[hdk_extern]
pub fn get_deleted_measurement_collections_for_bpv_device(
    arduino_serial_number: String,
) -> ExternResult<Vec<(SignedActionHashed, Vec<SignedActionHashed>)>> {
    let details = get_link_details(
        bpv_device_hash(arduino_serial_number)?,
        LinkTypes::BpvDeviceToMeasurementCollections,
        None,
        GetOptions::default(),
    )?;
    Ok(details
        .into_inner()
        .into_iter()
        .filter(|(_link, deletes)| !deletes.is_empty())
        .collect())
}
