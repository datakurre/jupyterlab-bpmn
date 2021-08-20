let
  jupyter = import (builtins.fetchGit {
    url = https://github.com/tweag/jupyterWith;
    rev = "";
  }) {};

  iPython = jupyter.kernels.iPythonWith {
    name = "python";
    packages = p: with p; [ numpy ];
  };

  jupyterEnvironment =
    jupyter.jupyterlabWith {
      kernels = [ iPython ];
      directory = ./jupyterlab;
      extraJupyterPath = pkgs:
        "${pkgs.python38Packages.pip}/lib/python3.8/site-packages";
    };
in
  jupyterEnvironment.env
