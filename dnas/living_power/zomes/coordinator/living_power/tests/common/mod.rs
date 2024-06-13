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



pub async fn sample_measure_collection_1(conductor: &SweetConductor, zome: &SweetZome) -> MeasureCollection {
    MeasureCollection {
          bpv_device_hash: create_bpv_device(conductor, zome, sample_bpv_device_1(conductor, zome).await).await.signed_action.hashed.hash,
	  measures: vec![10],
	  external_resistor_ohms: 10,
    }
}

pub async fn sample_measure_collection_2(conductor: &SweetConductor, zome: &SweetZome) -> MeasureCollection {
    MeasureCollection {
          bpv_device_hash: create_bpv_device(conductor, zome, sample_bpv_device_2(conductor, zome).await).await.signed_action.hashed.hash,
	  measures: vec![3],
	  external_resistor_ohms: 3,
    }
}

pub async fn create_measure_collection(conductor: &SweetConductor, zome: &SweetZome, measure_collection: MeasureCollection) -> Record {
    let record: Record = conductor
        .call(zome, "create_measure_collection", measure_collection)
        .await;
    record
}

