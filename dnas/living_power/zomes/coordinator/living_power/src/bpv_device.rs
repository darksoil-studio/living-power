
        use hdk::prelude::*;
        use living_power_integrity::*;

        
        #[hdk_extern]
        pub fn create_bpv_device(bpv_device: BpvDevice) -> ExternResult<Record> {
            let bpv_device_hash = create_entry(&EntryTypes::BpvDevice(bpv_device.clone()))?;
            
        
            let record = get(bpv_device_hash.clone(), GetOptions::default())?
                .ok_or(wasm_error!(WasmErrorInner::Guest("Could not find the newly created BpvDevice".to_string())))?;
            Ok(record)
        }
        
        
        #[hdk_extern]
        pub fn get_original_bpv_device(original_bpv_device_hash: ActionHash) -> ExternResult<Option<Record>> {
            let Some(details) = get_details(original_bpv_device_hash, GetOptions::default())? else {
                return Ok(None);
            };
            match details {
                Details::Record(details) => Ok(Some(details.record)),
                _ => Err(wasm_error!(WasmErrorInner::Guest("Malformed get details response".to_string()))),
            }
        }

        #[hdk_extern]
        pub fn get_latest_bpv_device(original_bpv_device_hash: ActionHash) -> ExternResult<Option<Record>> {
            let Some(details) = get_details(original_bpv_device_hash, GetOptions::default())? else {
                return Ok(None);
            };

            let record_details = match details {
                Details::Entry(_) => Err(wasm_error!(WasmErrorInner::Guest(
                "Malformed details".into()
                ))),
                Details::Record(record_details) => Ok(record_details)
            }?;

            match record_details.updates.last() {
                Some(update) => get_latest_bpv_device(update.action_address().clone()),
                None => Ok(Some(record_details.record)),
            }
        }

        #[hdk_extern]
        pub fn get_all_revisions_for_bpv_device(original_bpv_device_hash: ActionHash) -> ExternResult<Vec<Record>> {
            let Some(Details::Record(details)) = get_details(original_bpv_device_hash, GetOptions::default())? else {
                return Ok(vec![]);
            };

            let mut records = vec![details.record];

            for update in details.updates {
                let mut update_records = get_all_revisions_for_bpv_device(update.action_address().clone())?;

                records.append(&mut update_records);
            }

            Ok(records)
        }
        
        #[derive(Serialize, Deserialize, Debug)]
            pub struct UpdateBpvDeviceInput {
            pub previous_bpv_device_hash: ActionHash,
            pub updated_bpv_device: BpvDevice
        }

        #[hdk_extern]
        pub fn update_bpv_device(input: UpdateBpvDeviceInput) -> ExternResult<Record> {
            let updated_bpv_device_hash = update_entry(input.previous_bpv_device_hash, &input.updated_bpv_device)?;

            let record = get(updated_bpv_device_hash.clone(), GetOptions::default())?
                .ok_or(wasm_error!(WasmErrorInner::Guest("Could not find the newly updated BpvDevice".to_string())))?;
                
            Ok(record)
        }
        
        #[hdk_extern]
        pub fn delete_bpv_device(original_bpv_device_hash: ActionHash) -> ExternResult<ActionHash> {
            
            delete_entry(original_bpv_device_hash)
        }

        #[hdk_extern]
        pub fn get_all_deletes_for_bpv_device(
            original_bpv_device_hash: ActionHash,
        ) -> ExternResult<Option<Vec<SignedActionHashed>>> {
            let Some(details) = get_details(original_bpv_device_hash, GetOptions::default())? else {
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
        pub fn get_oldest_delete_for_bpv_device(
            original_bpv_device_hash: ActionHash,
        ) -> ExternResult<Option<SignedActionHashed>> {
            let Some(mut deletes) = get_all_deletes_for_bpv_device(original_bpv_device_hash)? else {
                return Ok(None);
            };

            deletes.sort_by(|delete_a, delete_b| delete_a.action().timestamp().cmp(&delete_b.action().timestamp()));

            Ok(deletes.first().cloned())
        }
        