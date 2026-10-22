#!/usr/bin/env bash
# Compiles doomgeneric + the KaiOS backend to app/js/doom.js with Emscripten
# (in Docker). KaiOS 2.5 is Gecko 48, which has no WebAssembly, so the output
# is plain JavaScript (WASM=0) built for that old engine.
set -euo pipefail
cd "$(dirname "$0")/.."

EMSDK_IMAGE=emscripten/emsdk:3.1.74

SRC="dummy am_map doomdef doomstat dstrings d_event d_items d_iwad d_loop d_main d_mode d_net
f_finale f_wipe g_game hu_lib hu_stuff info i_cdmus i_endoom i_joystick i_scale i_sound
i_system i_timer memio m_argv m_bbox m_cheat m_config m_controls m_fixed m_menu m_misc
m_random p_ceilng p_doors p_enemy p_floor p_inter p_lights p_map p_maputl p_mobj p_plats
p_pspr p_saveg p_setup p_sight p_spec p_switch p_telept p_tick p_user r_bsp r_data r_draw
r_main r_plane r_segs r_sky r_things sha1 sounds statdump st_lib st_stuff s_sound tables
v_video wi_stuff w_checksum w_file w_main w_wad z_zone w_file_stdc i_input i_video doomgeneric"

FILES=""
for f in $SRC; do FILES="$FILES doomgeneric/$f.c"; done

docker run --rm -v "$PWD":/src -w /src -u "$(id -u):$(id -g)" "$EMSDK_IMAGE" \
  emcc -O2 -Idoomgeneric \
    -DDOOMGENERIC_RESX=320 -DDOOMGENERIC_RESY=200 \
    -DDG_CANVAS_RGBA -DDG_NONBLOCKING_WIPE -DDG_KEYPAD_PROMPTS \
    -Wno-everything \
    $FILES port/doomgeneric_kaios.c \
    -sWASM=0 -sLEGACY_VM_SUPPORT=1 -sENVIRONMENT=web \
    -sINITIAL_MEMORY=33554432 -sSTACK_SIZE=1048576 \
    -sFORCE_FILESYSTEM=1 \
    -sEXPORTED_FUNCTIONS=_main,_kaios_key,_kaios_weapon,_kaios_weapon_release,_kaios_toggle_run,_kaios_pause,_kaios_sleep \
    -sEXPORTED_RUNTIME_METHODS=FS,HEAPU8,addRunDependency,removeRunDependency \
    -o app/js/doom.js

ls -l app/js/doom.js
