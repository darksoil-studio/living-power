{ inputs, ... }:

{
  # Import all `dnas/*/dna.nix` files
  imports = (map (m: "${./.}/dnas/${m}/dna.nix") (builtins.attrNames
    (if builtins.pathExists ./dnas then builtins.readDir ./dnas else { })));

  perSystem = { inputs', system, lib, self', ... }: {
    packages.living_power_happ =
      inputs.hc-infra.outputs.builders.${system}.happ {
        happManifest = ./workdir/happ.yaml;
        dnas = {
          # Include here the DNA packages for this hApp, e.g.:
          # my_dna = inputs'.some_input.packages.my_dna;
          # This overrides all the "bundled" properties for the hApp manifest
          living_power = self'.packages.living_power_dna;
        };
      };
  };
}
