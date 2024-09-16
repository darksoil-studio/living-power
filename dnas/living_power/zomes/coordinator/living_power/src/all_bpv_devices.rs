use hdk::prelude::*;
use living_power_integrity::*;

use crate::bpv_device::all_bpv_devices_path;

#[hdk_extern]
pub fn get_all_bpv_devices() -> ExternResult<Vec<Link>> {
    let path = all_bpv_devices_path();
    get_links(
        GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::AllBpvDevices)?.build(),
    )
}
