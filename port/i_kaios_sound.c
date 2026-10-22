// Sound effects for KaiOS: each sound's WAD lump goes to the page
// (app/js/sound.js), which plays it with Web Audio. No music yet.

#include <emscripten.h>

#include "deh_str.h"
#include "i_sound.h"
#include "m_misc.h"
#include "w_wad.h"
#include "z_zone.h"

// Bound as config variables by i_sound.c; unused here.
int use_libsamplerate = 0;
float libsamplerate_scale = 0.65f;

static boolean use_prefix;

static snddevice_t sound_devices[] = {
    SNDDEVICE_SB, SNDDEVICE_PAS, SNDDEVICE_GUS,
    SNDDEVICE_WAVEBLASTER, SNDDEVICE_SOUNDCANVAS, SNDDEVICE_AWE32,
};

static boolean Init(boolean use_sfx_prefix)
{
    use_prefix = use_sfx_prefix;
    return EM_ASM_INT({ return Module.sound && Module.sound.available() ? 1 : 0; });
}

static void Shutdown(void)
{
    EM_ASM({ Module.sound.stopAll(); });
}

static int GetSfxLumpNum(sfxinfo_t *sfx)
{
    char name[9];

    if (sfx->link != NULL)
        sfx = sfx->link;
    if (use_prefix)
        M_snprintf(name, sizeof(name), "ds%s", DEH_String(sfx->name));
    else
        M_StringCopy(name, DEH_String(sfx->name), sizeof(name));
    return W_GetNumForName(name);
}

static void Update(void)
{
}

// vol is 0-127, sep 0 (left) to 254 (right).
static void UpdateSoundParams(int channel, int vol, int sep)
{
    EM_ASM({ Module.sound.update($0, $1, $2); }, channel, vol, sep);
}

static int StartSound(sfxinfo_t *sfx, int channel, int vol, int sep)
{
    int lump = sfx->lumpnum;
    byte *data = W_CacheLumpNum(lump, PU_STATIC);
    int ok = EM_ASM_INT({ return Module.sound.play($0, $1, $2, $3, $4, $5) ? 1 : 0; },
                        channel, lump, data, W_LumpLength(lump), vol, sep);

    W_ReleaseLumpNum(lump);
    return ok ? channel : -1;
}

static void StopSound(int channel)
{
    EM_ASM({ Module.sound.stop($0); }, channel);
}

static boolean SoundIsPlaying(int channel)
{
    return EM_ASM_INT({ return Module.sound.playing($0) ? 1 : 0; }, channel);
}

static void CacheSounds(sfxinfo_t *sounds, int num_sounds)
{
    (void)sounds;
    (void)num_sounds;
}

sound_module_t DG_sound_module = {
    sound_devices,
    arrlen(sound_devices),
    Init,
    Shutdown,
    GetSfxLumpNum,
    Update,
    UpdateSoundParams,
    StartSound,
    StopSound,
    SoundIsPlaying,
    CacheSounds,
};

// No music: every call is a no-op.

static boolean MusicInit(void) { return false; }
static void MusicShutdown(void) { }
static void SetMusicVolume(int volume) { (void)volume; }
static void PauseMusic(void) { }
static void ResumeMusic(void) { }
static void *RegisterSong(void *data, int len) { (void)data; (void)len; return NULL; }
static void UnRegisterSong(void *handle) { (void)handle; }
static void PlaySong(void *handle, boolean looping) { (void)handle; (void)looping; }
static void StopSong(void) { }
static boolean MusicIsPlaying(void) { return false; }
static void Poll(void) { }

music_module_t DG_music_module = {
    NULL,
    0,
    MusicInit,
    MusicShutdown,
    SetMusicVolume,
    PauseMusic,
    ResumeMusic,
    RegisterSong,
    UnRegisterSong,
    PlaySong,
    StopSong,
    MusicIsPlaying,
    Poll,
};
