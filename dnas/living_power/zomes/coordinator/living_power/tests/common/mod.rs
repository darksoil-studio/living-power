use hdk::prelude::*;
use holochain::sweettest::*;

use living_power_integrity::*;

pub async fn sample_bpv_device_1(conductor: &SweetConductor, zome: &SweetZome) -> BpvDevice {
    BpvDevice {
        name: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.".to_string(),
        arduino_serial_number: "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
            .to_string(),
    }
}

pub async fn sample_bpv_device_2(conductor: &SweetConductor, zome: &SweetZome) -> BpvDevice {
    BpvDevice {
        name: "Lorem ipsum 2".to_string(),
        arduino_serial_number: "Lorem ipsum 2".to_string(),
    }
}

pub async fn create_bpv_device(
    conductor: &SweetConductor,
    zome: &SweetZome,
    bpv_device: BpvDevice,
) -> Record {
    let record: Record = conductor.call(zome, "create_bpv_device", bpv_device).await;
    record
}

pub async fn sample_measurement_collection_1(
    conductor: &SweetConductor,
    zome: &SweetZome,
) -> MeasurementCollection {
    MeasurementCollection {
        bpv_device_hash: create_bpv_device(
            conductor,
            zome,
            sample_bpv_device_1(conductor, zome).await,
        )
        .await
        .signed_action
        .hashed
        .hash,
        measurements: vec![Measurement {
            timestamp: Timestamp::now(),
            humidity_percentage: 30,
            temperature_celsius: 20,
            light_level_lux: 10,
            voltage_millivolts: 300,
        }],
        external_resistor_ohms: 10,
    }
}

pub async fn sample_measurement_collection_2(
    conductor: &SweetConductor,
    zome: &SweetZome,
) -> MeasurementCollection {
    MeasurementCollection {
        bpv_device_hash: create_bpv_device(
            conductor,
            zome,
            sample_bpv_device_2(conductor, zome).await,
        )
        .await
        .signed_action
        .hashed
        .hash,
        measurements: vec![Measurement {
            timestamp: Timestamp::now(),
            humidity_percentage: 20,
            temperature_celsius: 30,
            light_level_lux: 14,
            voltage_millivolts: 330,
        }],
        external_resistor_ohms: 3,
    }
}

pub async fn create_measurement_collection(
    conductor: &SweetConductor,
    zome: &SweetZome,
    measurement_collection: MeasurementCollection,
) -> Record {
    let record: Record = conductor
        .call(
            zome,
            "create_measurement_collection",
            measurement_collection,
        )
        .await;
    record
}
