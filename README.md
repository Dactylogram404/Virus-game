#include <iostream>
#include <vector>
#include <string>
#include <thread>
#include <chrono>
#include <conio.h>
#include <cstdlib>
#include <ctime>

using namespace std;

/* ===================== CONSTANTS ===================== */
const int SCREEN_WIDTH = 44;
const int GROUND_Y    = 22;
const int JUMP_HEIGHT = 10;
const int GRAVITY     = 2;
const int FRAME_DELAY = 120;

const int CORRUPTION_DELAY = 6;   // seconds standing still
const int CORRUPTION_STAGES = 9;
const int LOCK_SECONDS = 20;      // set to 3600 later

/* ===================== STATES ===================== */
enum GameState {
    GAME,
    CORRUPTING,
    GLITCH_WORLD,
    PLUG_MENU,
    VIRUS_OK,
    ASSIMILATED,
    LOCKED
};

GameState state = GAME;

/* ===================== SCREEN ===================== */
void clearScreen() {
    cout << "\033[2J\033[1;1H";
}

/* ===================== GLITCH ===================== */
string glitchChar() {
    static vector<string> g = { "#", "%", "@", "▓", "▒", "░" };
    return g[rand() % g.size()];
}

/* ===================== CHARACTER FRAMES ===================== */
vector<vector<string>> frames = {

    {
        "         ██ ██ ██",
        "         ██ ██ ██",
        "            ██",
        "    [] ██ ██ ██ ██ []",
        "    [= ██ [][][] ██ =]",
        "            ##",
        "            ##",
        "      []          []",
        "      ##          ##"
    },
    {
        "         ██ ██ ██",
        "         ██ ██ ██",
        "            ██",
        "    [] ██ ██ ██ ██ []",
        "    [= ██ [][][] ██ =]",
        "            []",
        "            []",
        "         []",
        "      ##"
    },
    {
        "         ██ ██ ██",
        "         ██ ██ ██",
        "            ██",
        "    [] ██ ██ ██ ██ []",
        "    [= ██ [][][] ██ =]",
        "            []",
        "            []",
        "               []",
        "                  ##"
    },
    {
        "         ██ ██ ██",
        "         ██ ██ ██",
        "            ██",
        "    [] ██ ██ ██ ██ []",
        "    [= ██ [][][] ██ =]",
        "          ######",
        "          ######",
        "      []              []"
    }
};

vector<string> corrupted;

/* ===================== CORRUPTION ===================== */
vector<string> corruptFrame(const vector<string>& src, int level) {
    vector<string> out = src;
    for (int i = 0; i < level && i < out.size(); i++) {
        string n;
        for (char c : out[i]) {
            if (c == ' ') n += ' ';
            else n += glitchChar();
        }
        out[i] = n;
    }
    return out;
}

/* ===================== DRAW ===================== */
void drawGround(bool glitch = false) {
    if (!glitch) {
        cout << string(SCREEN_WIDTH, '=') << endl;
        return;
    }
    for (int i = 0; i < SCREEN_WIDTH; i++) {
        cout << glitchChar();
    }
    cout << endl;
}

void drawPlayer(const vector<string>& body, int x) {
    for (auto& line : body)
        cout << string(x, ' ') << line << endl;
}

/* ===================== MENUS ===================== */
void plugMenu(bool glitchy) {
    clearScreen();
    auto print = [&](string s) {
        for (char c : s) {
            if (glitchy && rand() % 4 == 0)
                cout << glitchChar();
            else
                cout << c;
        }
        cout << endl;
    };

    print("_______________________________");
    print("[      plug   it              ]");
    print("[         IN                  ]");
    print("[_____________________________]");
    cout << endl;
    print("1 plug in");
    print("2 don't");
}

/* ===================== MAIN ===================== */
int main() {
    srand((unsigned)time(nullptr));

    int playerX = SCREEN_WIDTH / 2;
    int playerY = GROUND_Y - frames[0].size();

    bool jumping = false;
    bool squatting = false;
    int frameIndex = 0;

    int corruptionLevel = 0;
    auto lastMove = chrono::steady_clock::now();
    auto lockStart = chrono::steady_clock::now();

    while (true) {

        bool moved = false;

        /* ===== INPUT ===== */
        if (_kbhit()) {
            char key = _getch();
            lastMove = chrono::steady_clock::now();

            if (state == GAME) {
                if (key == 'a' && playerX > 0) playerX--;
                if (key == 'd' && playerX < SCREEN_WIDTH - 1) playerX++;
                if (key == 's') squatting = true;
                if (key == 'w') {
                    squatting = false;
                    if (!jumping) {
                        playerY -= JUMP_HEIGHT;
                        jumping = true;
                    }
                }
                moved = true;
            }

            if (state == PLUG_MENU) {
                if (key == '1') state = VIRUS_OK;
                if (key == '2') state = ASSIMILATED;
            }

            if (state == VIRUS_OK) {
                if (key == '1') {
                    corruptionLevel = 0;
                    state = GAME;
                }
                if (key == '2') {
                    corruptionLevel = 0;
                    playerX = SCREEN_WIDTH / 2;
                    state = GAME;
                }
            }
        }

        /* ===== GRAVITY ===== */
        if (jumping) {
            playerY += GRAVITY;
            int floorY = GROUND_Y - frames[0].size();
            if (playerY >= floorY) {
                playerY = floorY;
                jumping = false;
            }
        }

        /* ===== STATE LOGIC ===== */
        if (state == GAME) {
            if (chrono::duration_cast<chrono::seconds>(
                    chrono::steady_clock::now() - lastMove).count()
                >= CORRUPTION_DELAY) {
                state = CORRUPTING;
            }
        }

        if (state == CORRUPTING) {
            corruptionLevel++;
            if (corruptionLevel >= CORRUPTION_STAGES)
                state = GLITCH_WORLD;
        }

        clearScreen();

        /* ===== RENDER ===== */
        if (state == GAME || state == CORRUPTING) {
            vector<string> body = frames[frameIndex];
            if (state == CORRUPTING)
                body = corruptFrame(frames[frameIndex], corruptionLevel);

            for (int i = 0; i < playerY; i++) cout << endl;
            drawPlayer(body, playerX);
            for (int i = 0; i < GROUND_Y - playerY - body.size(); i++)
                cout << endl;
            drawGround(state == CORRUPTING);
        }

        else if (state == GLITCH_WORLD) {
            for (int i = 0; i < 12; i++) {
                clearScreen();
                drawPlayer(corruptFrame(frames[0], CORRUPTION_STAGES), playerX);
                drawGround(true);
                this_thread::sleep_for(chrono::milliseconds(80));
            }
            state = PLUG_MENU;
        }

        else if (state == PLUG_MENU) {
            plugMenu(false);
        }

        else if (state == VIRUS_OK) {
            cout << "[ Virus terminated ]\n\n";
            cout << "1 continue\n";
            cout << "2 add task\n";
        }

        else if (state == ASSIMILATED) {
            for (int i = 0; i < 8; i++) {
                plugMenu(true);
                this_thread::sleep_for(chrono::milliseconds(120));
            }
            lockStart = chrono::steady_clock::now();
            state = LOCKED;
        }

        else if (state == LOCKED) {
            cout << "\n\n      [ you are us ]\n";
            if (chrono::duration_cast<chrono::seconds>(
                    chrono::steady_clock::now() - lockStart).count()
                >= LOCK_SECONDS) {
                return 0;
            }
        }

        this_thread::sleep_for(chrono::milliseconds(FRAME_DELAY));
    }
}
