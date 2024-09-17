use hdk::prelude::*;
use living_power_integrity::*;

#[derive(Serialize, Deserialize, Debug, SerializedBytes)]
pub struct BpvDeviceInfo {
    name: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SetBpvDeviceInfoInput {
    pub arduino_serial_number: String,
    pub info: BpvDeviceInfo,
}

pub fn all_bpv_devices_path() -> Path {
    Path::from(format!("all_bpv_devices"))
}

pub fn bpv_device_path(arduino_serial_number: String) -> ExternResult<TypedPath> {
    Path::from(format!("all_bpv_devices.{arduino_serial_number}")).typed(LinkTypes::AllBpvDevices)
}

#[hdk_extern]
pub fn bpv_device_hash(arduino_serial_number: String) -> ExternResult<EntryHash> {
    let path = bpv_device_path(arduino_serial_number)?;
    path.path_entry_hash()
}

#[hdk_extern]
pub fn set_bpv_device_info(input: SetBpvDeviceInfoInput) -> ExternResult<()> {
    let path = bpv_device_path(input.arduino_serial_number)?;
    path.ensure()?;

    let bytes = SerializedBytes::try_from(input.info)
        .map_err(|err| wasm_error!(WasmErrorInner::Guest(format!("{err:?}"))))?;

    create_link(
        path.path_entry_hash()?,
        path.path_entry_hash()?,
        LinkTypes::BpvDeviceToBpvDeviceInfo,
        bytes.bytes().to_vec(),
    )?;

    Ok(())
}

#[hdk_extern]
pub fn get_bpv_device_info(arduino_serial_number: String) -> ExternResult<Vec<Link>> {
    let path = bpv_device_path(arduino_serial_number)?;

    get_links(
        GetLinksInputBuilder::try_new(
            path.path_entry_hash()?,
            LinkTypes::BpvDeviceToBpvDeviceInfo,
        )?
        .build(),
    )
}
