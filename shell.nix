{ pkgs ? import ./nix {}
, sources ? import ./nix/sources.nix
}:

pkgs.mkShell {
  buildInputs = with pkgs; [
    gnumake
    niv
    nodejs
    yarn
    poetry
    poetry2nix.cli
    twine
    (jupyterWith.jupyterlabWith {})
  ];
  shellHook = ''
    export SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt
  '';
}
