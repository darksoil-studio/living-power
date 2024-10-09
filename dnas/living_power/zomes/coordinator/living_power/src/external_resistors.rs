use hdk::prelude::*;
use living_power_integrity::LinkTypes;

use crate::bpv_device::bpv_device_hash;

#[derive(Serialize, Deserialize, Debug)]
pub struct SetExternalResistorValueInput {
    pub arduino_serial_number: String,
    pub previous_create_link_action_hash: Option<ActionHash>,
    pub external_resistor_value: ExternalResistorValue,
}

#[derive(Serialize, PartialEq, Eq, Deserialize, Debug, SerializedBytes)]
pub struct ExternalResistorValue {
    pub external_resistor_value_ohms: u64,
    pub from: Timestamp,
    pub to: Timestamp,
}

#[hdk_extern]
pub fn set_external_resistor_value(input: SetExternalResistorValueInput) -> ExternResult<()> {
    if let Some(action_hash) = input.previous_create_link_action_hash {
        delete_link(action_hash)?;
    }

    let base = bpv_device_hash(input.arduino_serial_number)?;
    let tag = SerializedBytes::try_from(input.external_resistor_value)
        .map_err(|err| wasm_error!(WasmErrorInner::Guest(format!("{err:?}"))))?;
    create_link(
        base.clone(),
        base,
        LinkTypes::BpvDeviceToExternalResistorValues,
        tag.bytes().to_vec(),
    )?;

    Ok(())
}

#[hdk_extern]
pub fn get_all_external_resistor_values(arduino_serial_number: String) -> ExternResult<Vec<Link>> {
    let base = bpv_device_hash(arduino_serial_number)?;
    get_links(
        GetLinksInputBuilder::try_new(base, LinkTypes::BpvDeviceToExternalResistorValues)?.build(),
    )
}
