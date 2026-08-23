Post-install model setup instructions

This repository includes a postinstall helper at `scripts/setup-model.js` which runs automatically after `npm install`.

Environment variables you can set before running `npm install`:
- `MODEL_URL`: URL to download the model artifact into the `models/` folder.
- `AUTO_YES=1` or pass `--yes`: allow automatic actions (download, pip install, clone/build runtimes).
- `LLM_RUNTIME=llama.cpp`: clone and build the `llama.cpp` runtime under `runtimes/llama.cpp` (when `AUTO_YES=1`).
- `RUN_BUILD=1`: run `npm run build` after setup.

If you don't set `MODEL_URL`, a `.env` template will be created at project root. Edit it and set `MODEL_PATH` to your model file.

Notes:
- Automatic downloads and builds can be large; set `AUTO_YES=1` only when you want unattended setup.
- The script attempts to be cross-platform but may call system tools (`git`, `make`, `python`, `pip`) which must be installed separately.
