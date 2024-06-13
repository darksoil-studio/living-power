use hdk::prelude::*;
use holochain::sweettest::*;

use living_power_integrity::*;



pub async fn sample_bpv_device_1(conductor: &SweetConductor, zome: &SweetZome) -> BpvDevice {
    BpvDevice {
	  name: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.".to_string(),
	  arduino_serial_number: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.".to_string(),
    }
}

pub async fn sample_bpv_device_2(conductor: &SweetConductor, zome: &SweetZome) -> BpvDevice {
    BpvDevice {
	  name: "Lorem ipsum 2".to_string(),
	  arduino_serial_number: "Lorem ipsum 2".to_string(),
    }
}

pub async fn create_bpv_device(conductor: &SweetConductor, zome: &SweetZome, bpv_device: BpvDevice) -> Record {
    let record: Record = conductor
        .call(zome, "create_bpv_device", bpv_device)
        .await;
    record
}

