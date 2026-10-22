// doomgeneric backend for KaiOS. The page (app/js/main.js) draws each frame
// and feeds key events; this file runs the game one tic at a time.

#include <emscripten.h>

#include "doomgeneric.h"
#include "doomkeys.h"
#include "doomstat.h"
#include "d_player.h"
#include "i_timer.h"
#include "m_controls.h"
#include "m_menu.h"

extern int show_endoom;

#define KEYQUEUE_SIZE 64
#define ALWAYS_RUN 29   // a joystick "speed" button past the last one counts as held

boolean D_Wiping(void);
void D_ContinueWipe(void);

static unsigned short key_queue[KEYQUEUE_SIZE];
static unsigned int key_write = 0;
static unsigned int key_read = 0;
static int last_tic = -1;
static int weapon_key = 0;

// Weapon slot key for each weapontype_t: fist, pistol, shotgun, chaingun,
// rocket launcher, plasma, BFG, chainsaw, super shotgun.
static const unsigned char slot_keys[NUMWEAPONS] = { '1', '2', '3', '4', '5', '6', '7', '1', '3' };
// The order "next weapon" walks through.
static const weapontype_t weapon_order[NUMWEAPONS] = {
    wp_fist, wp_chainsaw, wp_pistol, wp_shotgun, wp_supershotgun,
    wp_chaingun, wp_missile, wp_plasma, wp_bfg
};

static void enqueue(int pressed, unsigned char key)
{
    unsigned int next = (key_write + 1) % KEYQUEUE_SIZE;

    if (next == key_read)
        return;     // full: drop the key rather than overwrite unread ones
    key_queue[key_write] = (unsigned short)((pressed << 8) | key);
    key_write = next;
}

EMSCRIPTEN_KEEPALIVE void kaios_key(int pressed, int key)
{
    enqueue(pressed ? 1 : 0, (unsigned char)key);
}

static int owns(player_t *p, weapontype_t w)
{
    if (!p->weaponowned[w])
        return 0;
    if (gamemode == shareware && (w == wp_plasma || w == wp_bfg))
        return 0;
    return w != wp_supershotgun || gamemode == commercial;
}

// Presses the slot key of the next (dir 1) or previous (dir -1) weapon the
// player has; kaios_weapon_release lets go of it on keyup.
EMSCRIPTEN_KEEPALIVE void kaios_weapon(int dir)
{
    player_t *p = &players[consoleplayer];
    int i, at = 0;

    if (gamestate != GS_LEVEL || p->mo == NULL)
        return;
    for (i = 0; i < NUMWEAPONS; i++)
        if (weapon_order[i] == p->readyweapon)
            at = i;
    for (i = 1; i < NUMWEAPONS; i++)
    {
        weapontype_t w = weapon_order[(at + dir * i + NUMWEAPONS * 2) % NUMWEAPONS];
        if (owns(p, w))
        {
            weapon_key = slot_keys[w];
            enqueue(1, weapon_key);
            return;
        }
    }
}

EMSCRIPTEN_KEEPALIVE void kaios_weapon_release(void)
{
    if (weapon_key)
        enqueue(0, weapon_key);
    weapon_key = 0;
}

EMSCRIPTEN_KEEPALIVE int kaios_toggle_run(void)
{
    joybspeed = joybspeed == ALWAYS_RUN ? 2 : ALWAYS_RUN;
    players[consoleplayer].message = joybspeed == ALWAYS_RUN ? "Always run ON" : "Always run OFF";
    return joybspeed == ALWAYS_RUN;
}

// Called when the app is hidden: bring up the menu, which pauses the game.
EMSCRIPTEN_KEEPALIVE void kaios_pause(void)
{
    if (!menuactive && gamestate == GS_LEVEL)
        M_StartControlPanel();
}

// Stops (asleep 1) or restarts (0) the main loop while the app is hidden.
EMSCRIPTEN_KEEPALIVE void kaios_sleep(int asleep)
{
    if (asleep)
        emscripten_pause_main_loop();
    else
        emscripten_resume_main_loop();
}

void DG_Init(void)
{
}

void DG_DrawFrame(void)
{
    EM_ASM({ Module.drawFrame($0); }, DG_ScreenBuffer);
}

// The browser cannot block; frame() below only runs a tic once one is due,
// so the game never has to wait.
void DG_SleepMs(uint32_t ms)
{
    (void)ms;
}

uint32_t DG_GetTicksMs(void)
{
    return (uint32_t)emscripten_get_now();
}

int DG_GetKey(int *pressed, unsigned char *key)
{
    unsigned short data;

    if (key_read == key_write)
        return 0;
    data = key_queue[key_read];
    key_read = (key_read + 1) % KEYQUEUE_SIZE;
    *pressed = data >> 8;
    *key = data & 0xff;
    return 1;
}

void DG_SetWindowTitle(const char *title)
{
    (void)title;
}

static void frame(void)
{
    int now;

    if (D_Wiping())
    {
        D_ContinueWipe();
        return;
    }
    now = I_GetTime();
    if (now == last_tic)
        return;
    last_tic = now;
    doomgeneric_Tick();
}

int main(int argc, char **argv)
{
    doomgeneric_Create(argc, argv);
    joybspeed = ALWAYS_RUN;
    key_menu_confirm = KEY_ENTER;   // OK answers "are you sure?"
    show_endoom = 0;                // the DOS text screen would end in exit()
    emscripten_set_main_loop(frame, 0, 1);
    return 0;
}
