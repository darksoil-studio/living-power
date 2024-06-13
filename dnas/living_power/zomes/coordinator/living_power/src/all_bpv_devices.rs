use hdk::prelude::*;
use living_power_integrity::*;

#[hdk_extern]
pub fn get_all_bpv_devices() -> ExternResult<Vec<Link>> {
    let path = Path::from("all_bpv_devices");
    get_links(GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::AllBpvDevices)?.build())
}
