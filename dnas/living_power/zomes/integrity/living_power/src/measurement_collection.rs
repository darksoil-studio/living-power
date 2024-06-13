use hdi::prelude::*;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct Measurement {
    pub timestamp: Timestamp,
    pub humidity_percentage: u32,
    pub temperature_celsius: u32,
    pub light_level_lux: u32,
    pub votage_millivolts: u32,
}

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct MeasurementCollection {
    pub bpv_device_hash: ActionHash,
    pub measurements: Vec<Measurement>,
    pub external_resistor_ohms: u32,
}

pub fn validate_create_measurement_collection(
    _action: EntryCreationAction,
    measurement_collection: MeasurementCollection,
) -> ExternResult<ValidateCallbackResult> {
    let record = must_get_valid_record(measurement_collection.bpv_device_hash.clone())?;
    let _bpv_device: crate::BpvDevice = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Dependant action must be accompanied by an entry"
        ))))?;
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_update_measurement_collection(
    _action: Update,
    _measurement_collection: MeasurementCollection,
    _original_action: EntryCreationAction,
    _original_measurement_collection: MeasurementCollection,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Invalid(String::from(
        "Measurement Collections cannot be updated",
    )))
}
pub fn validate_delete_measurement_collection(
    _action: Delete,
    _original_action: EntryCreationAction,
    _original_measurement_collection: MeasurementCollection,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_create_link_bpv_device_to_measurement_collections(
    _action: CreateLink,
    base_address: AnyLinkableHash,
    target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    // Check the entry type for the given action hash
    let action_hash = base_address
        .into_action_hash()
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "No action hash associated with link".to_string()
        )))?;
    let record = must_get_valid_record(action_hash)?;
    let _bpv_device: crate::BpvDevice = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "Linked action must reference an entry".to_string()
        )))?;
    // Check the entry type for the given action hash
    let action_hash =
        target_address
            .into_action_hash()
            .ok_or(wasm_error!(WasmErrorInner::Guest(
                "No action hash associated with link".to_string()
            )))?;
    let record = must_get_valid_record(action_hash)?;
    let _measurement_collection: crate::MeasurementCollection = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "Linked action must reference an entry".to_string()
        )))?;
    // TODO: add the appropriate validation rules
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_delete_link_bpv_device_to_measurement_collections(
    _action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    // TODO: add the appropriate validation rules
    Ok(ValidateCallbackResult::Valid)
}
