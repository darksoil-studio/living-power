{
  description = "Template for Holochain app development";

  inputs = {
    holonix.url = "github:holochain/holonix";

    p2p-shipyard.url = "github:darksoil-studio/p2p-shipyard/next";

    nixpkgs.url = "github:nixos/nixpkgs/nixos-24.05";
    flake-parts.follows = "holonix/flake-parts";
    crane.follows = "holonix/crane";

    hc-infra.url = "github:holochain-open-dev/infrastructure/next";
    scaffolding.url = "github:holochain-open-dev/templates";
  };

  outputs = inputs:
    inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [ ./happ.nix ];

      systems = builtins.attrNames inputs.holonix.devShells;
      perSystem = { inputs', self', config, lib, pkgs, system, ... }: {
        devShells.default = pkgs.mkShell {
          inputsFrom = [
            inputs'.p2p-shipyard.devShells.holochainTauriDev
            inputs'.hc-infra.devShells.synchronized-pnpm
            inputs'.holonix.devShells.default
          ];
          packages = [ inputs'.scaffolding.packages.hc-scaffold-app-template ]
            ++ (lib.optionals pkgs.stdenv.isLinux [
              pkgs.arduino-ide
              pkgs.udev
            ]);
        };
        devShells.androidDev = pkgs.mkShell {
          inputsFrom = [
            inputs'.p2p-shipyard.devShells.holochainTauriAndroidDev
            inputs'.hc-infra.devShells.synchronized-pnpm
            inputs'.holonix.devShells.default
          ];
          packages =
            [ inputs'.scaffolding.packages.hc-scaffold-app-template pkgs.udev ];
        };

        packages = let
          craneLib = (inputs.crane.mkLib pkgs).overrideToolchain
            inputs'.holonix.packages.rust;
          pname = "living-power";
          version = "0.0.1";
          src =
            inputs.p2p-shipyard.outputs.lib.cleanTauriSource { inherit lib; }
            (craneLib.path ./.);
          ui = pkgs.stdenv.mkDerivation (finalAttrs: {
            inherit version;
            pname = "${pname}-ui";
            pnpmWorkspace = "ui";
            src = ./.;

            nativeBuildInputs = with pkgs; [ nodejs pnpm.configHook ];
            pnpmDeps = pkgs.pnpm.fetchDeps {
              inherit (finalAttrs) pnpmWorkspace version pname src;

              hash = "sha256-09peVeaAiu42Sp37BcjNeLXsF/EPHErlRJFfFKKyYPg=";
            };
            buildPhase = ''
              runHook preBuild

              pnpm --filter=ui build

              runHook postBuild
              mkdir $out
              cp -R ui/dist $out
            '';
          });
          commonArgs = {
            inherit pname version src;

            doCheck = false;
            cargoBuildCommand =
              "cargo build --bins --release --locked --features tauri/custom-protocol,tauri/native-tls";
            cargoCheckCommand = "";
            cargoExtraArgs = "";

            buildInputs = [ pkgs.udev ]
              ++ inputs.p2p-shipyard.outputs.dependencies.${system}.tauriHapp.buildInputs;

            nativeBuildInputs =
              inputs.p2p-shipyard.outputs.dependencies.${system}.tauriHapp.nativeBuildInputs;

            postPatch = ''
              mkdir -p "$TMPDIR/nix-vendor"
              cp -Lr "$cargoVendorDir" -T "$TMPDIR/nix-vendor"
              sed -i "s|$cargoVendorDir|$TMPDIR/nix-vendor/|g" "$TMPDIR/nix-vendor/config.toml"
              chmod -R +w "$TMPDIR/nix-vendor"
              cargoVendorDir="$TMPDIR/nix-vendor"
            '';
          };
          cargoArtifacts = craneLib.buildDepsOnly commonArgs;
          tauriApp = craneLib.buildPackage (commonArgs // {
            inherit cargoArtifacts;
            cargoBuildCommand = ''
              substituteInPlace src-tauri/tauri.conf.json \
                --replace-fail '"frontendDist": "../ui/dist"' '"frontendDist": "${ui}/dist"' \
                --replace-fail '"beforeBuildCommand": "pnpm -F ui build",' '"beforeBuildCommand": "",'
              cp ${self'.packages.living_power_happ} workdir/living-power.happ
              cp ${self'.packages.living_power_dna.hash} workdir/living_power_dna-hash
              ${commonArgs.cargoBuildCommand}'';
          });
        in {
          inherit ui;
          living-power = tauriApp;
        };

      };
    };
}
