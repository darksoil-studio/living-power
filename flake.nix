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

  nixConfig = {
    extra-substituters = [
      "https://holochain-ci.cachix.org"
      "https://holochain-open-dev.cachix.org"
      "https://darksoil-studio.cachix.org"
    ];
    extra-trusted-public-keys = [
      "holochain-ci.cachix.org-1:5IUSkZc0aoRS53rfkvH9Kid40NpyjwCMCzwRTXy+QN8="
      "holochain-open-dev.cachix.org-1:3Tr+9in6uo44Ga7qiuRIfOTFXog+2+YbyhwI/Z6Cp4U="
      "darksoil-studio.cachix.org-1:UEi+aujy44s41XL/pscLw37KEVpTEIn8N/kn7jO8rkc="
    ];
  };

  outputs = inputs:
    inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [ ./happ.nix ];

      systems = builtins.attrNames inputs.holonix.devShells;
      perSystem = { inputs', self', config, lib, pkgs, system, ... }:
        let
          tauriConfig =
            builtins.fromJSON (builtins.readFile ./src-tauri/tauri.conf.json);
          cargoToml =
            builtins.fromTOML (builtins.readFile ./src-tauri/Cargo.toml);
          pname = cargoToml.package.name;
          version = tauriConfig.version;

        in rec {
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
            packages = [ inputs'.scaffolding.packages.hc-scaffold-app-template ]
              ++ (lib.optionals pkgs.stdenv.isLinux [
                pkgs.arduino-ide
                pkgs.udev
              ]);
          };

          packages = let
            craneLib = (inputs.crane.mkLib pkgs).overrideToolchain
              inputs'.holonix.packages.rust;
            src =
              inputs.p2p-shipyard.outputs.lib.cleanTauriSource { inherit lib; }
              (craneLib.path ./.);

            ui = pkgs.stdenv.mkDerivation (finalAttrs: {
              inherit version;
              pname = "${pname}-ui";
              pnpmWorkspace = "ui";
              src = (inputs.hc-infra.outputs.lib.cleanPnpmDepsSource {
                inherit lib;
              }) ./.;

              nativeBuildInputs = with pkgs; [ nodejs pnpm.configHook ];
              pnpmDeps = pkgs.pnpm.fetchDeps {
                inherit (finalAttrs) pnpmWorkspace version pname src;

                hash = "sha256-1n3sefKemRPF1y2qqRrChQSsneqtqV72po8xhqZXMzc=";
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

              buildInputs =
                inputs.p2p-shipyard.outputs.dependencies.${system}.tauriHapp.buildInputs
                ++ (lib.optionals pkgs.stdenv.isLinux [ pkgs.udev ]);

              nativeBuildInputs =
                inputs.p2p-shipyard.outputs.dependencies.${system}.tauriHapp.nativeBuildInputs;

              postPatch = ''
                mkdir -p "$TMPDIR/nix-vendor"
                cp -Lr "$cargoVendorDir" -T "$TMPDIR/nix-vendor"
                sed -i "s|$cargoVendorDir|$TMPDIR/nix-vendor/|g" "$TMPDIR/nix-vendor/config.toml"
                chmod -R +w "$TMPDIR/nix-vendor"
                cargoVendorDir="$TMPDIR/nix-vendor"
              '';
              stdenv = if pkgs.stdenv.isDarwin then
                pkgs.overrideSDK pkgs.stdenv "11.0"
              else
                pkgs.stdenv;

            };
            #cargoArtifacts = craneLib.buildDepsOnly commonArgs;
            tauriApp = craneLib.buildPackage (commonArgs // {
              #inherit cargoArtifacts;
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
            living-power = pkgs.runCommandNoCC "living-power" {
              buildInputs = [ pkgs.makeWrapper ];
              __ignoreNulls = true;

            } ''
              mkdir $out
              mkdir $out/bin
              # Because we create this ourself, by creating a wrapper
              makeWrapper ${tauriApp}/bin/living-power $out/bin/living-power \
                --set WEBKIT_DISABLE_DMABUF_RENDERER 1
            '';
          };

          apps.default.program = pkgs.writeShellApplication {
            name = "${pname}-${version}";
            runtimeInputs = [ packages.living-power ];
            text = ''
              living-power
            '';
          };
        };

    };
}
