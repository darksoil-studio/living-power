use hdi::prelude::*;
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct BpvDevice {
    pub name: String,
    pub arduino_serial_number: String,
}
pub fn validate_create_bpv_device(
    _action: EntryCreationAction,
    _bpv_device: BpvDevice,
) -> ExternResult<ValidateCallbackResult> {
    // TODO: add the appropriate validation rules
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_update_bpv_device(
    _action: Update,
    _bpv_device: BpvDevice,
    _original_action: EntryCreationAction,
    _original_bpv_device: BpvDevice,
) -> ExternResult<ValidateCallbackResult> {
    // TODO: add the appropriate validation rules
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_delete_bpv_device(
    _action: Delete,
    _original_action: EntryCreationAction,
    _original_bpv_device: BpvDevice,
) -> ExternResult<ValidateCallbackResult> {
    // TODO: add the appropriate validation rules
    Ok(ValidateCallbackResult::Valid)
}
