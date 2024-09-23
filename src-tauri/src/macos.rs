use tauri::utils::platform::current_exe;


#[tauri::command]
pub fn should_be_moved_to_applications_directory() -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        if tauri::is_dev() {
            return Ok(false);
        }
        let current_executable = current_exe().map_err(|err| format!("Could not get current executable: {err:?}"))?;

        let is_in_folder = current_executable.starts_with("/Applications");
        Ok(!is_in_folder)
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(false)
    }
}
