let
  pkgs = import <nixpkgs> {};
  node = pkgs.nodejs-18_x;
in
pkgs.mkShell {
  buildInputs = [node pkgs.nodePackages.npm];
}
