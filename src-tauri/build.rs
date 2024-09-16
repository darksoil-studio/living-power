fn main() {
    println!("cargo:rerun-if-changed=../workdir/living-power.happ");
    tauri_build::build()
}
