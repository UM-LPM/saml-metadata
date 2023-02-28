let
  pkgs = import <nixpkgs> {};
  node = pkgs.nodejs-14_x;
in
pkgs.mkShell {
  buildInputs = [node pkgs.nodePackages.npm];
}
