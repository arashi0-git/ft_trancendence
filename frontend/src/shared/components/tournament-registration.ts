import type { Tournament, TournamentPlayer, Match } from "../types/tournament";

export class TournamentRegistration {
  private container: HTMLElement;
  private tournament: Tournament | null = null;
  private onTournamentStart: ((tournament: Tournament) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h2 class="text-2xl font-bold mb-4 text-center">Tournament Registration</h2>

                <div id="tournament-setup" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Number of Players</label>
                        <select id="player-count" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                            <option value="2">2 Players</option>
                            <option value="4">4 Players</option>
                            <option value="8">8 Players</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Tournament Name</label>
                        <input
                            type="text"
                            id="tournament-name"
                            placeholder="Enter tournament name"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                    </div>

                    <button
                        id="create-tournament"
                        class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
                    >
                        Create Tournament
                    </button>
                </div>

                <div id="player-registration" class="hidden space-y-4">
                    <div class="text-center mb-4">
                        <h3 class="text-lg font-semibold">Enter Player Aliases</h3>
                        <p class="text-sm text-gray-600">Each player must enter their tournament nickname</p>
                    </div>

                    <div id="player-inputs" class="space-y-3">
                        <!-- プレイヤー入力フィールド生成 -->
                    </div>

                    <div class="flex space-x-4">
                        <button
                            id="back-to-setup"
                            class="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
                        >
                            Back
                        </button>
                        <button
                            id="start-tournament"
                            class="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"
                            disabled
                        >
                            Start Tournament
                        </button>
                    </div>
                </div>
            </div>
        `;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    const createTournamentBtn = document.getElementById("create-tournament");
    const backToSetupBtn = document.getElementById("back-to-setup");
    const startTournamentBtn = document.getElementById("start-tournament");

    createTournamentBtn?.addEventListener("click", () =>
      this.showPlayerRegistration(),
    );
    backToSetupBtn?.addEventListener("click", () => this.showTournamentSetup());
    startTournamentBtn?.addEventListener("click", () => this.startTournament());
  }

  private showPlayerRegistration(): void {
    const playerCountElement = document.getElementById("player-count");
    const tournamentNameElement = document.getElementById("tournament-name");

    if (!playerCountElement || !tournamentNameElement) {
      console.error("Required tournament setup elements not found");
      return;
    }

    const playerCount = parseInt(
      (playerCountElement as HTMLSelectElement).value,
      10,
    );
    const tournamentName =
      (tournamentNameElement as HTMLInputElement).value.trim() ||
      "Pong Tournament";

    this.tournament = {
      id: this.generateId(),
      name: tournamentName,
      players: [],
      matches: [],
      status: "registration",
      maxPlayers: playerCount,
      currentRound: 1,
      createdAt: new Date(),
    };

    document.getElementById("tournament-setup")?.classList.add("hidden");
    document.getElementById("player-registration")?.classList.remove("hidden");

    this.generatePlayerInputs(playerCount);
  }

  private generatePlayerInputs(playerCount: number): void {
    const playerInputsContainer = document.getElementById("player-inputs");
    if (!playerInputsContainer) return;

    playerInputsContainer.innerHTML = "";

    for (let i = 1; i <= playerCount; i++) {
      const inputDiv = document.createElement("div");
      inputDiv.innerHTML = `
                <label class="block text-sm font-medium text-gray-700 mb-1">Player ${i} Alias</label>
                <input
                    type="text"
                    id="player-${i}-alias"
                    placeholder="Enter alias for Player ${i}"
                    maxlength="20"
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
            `;
      playerInputsContainer.appendChild(inputDiv);

      const input = inputDiv.querySelector("input") as HTMLInputElement;
      input.addEventListener("input", () => this.validatePlayerInputs());
    }
  }

  private validatePlayerInputs(): void {
    const startbtn = document.getElementById(
      "start-tournament",
    ) as HTMLButtonElement;
    const inputs = document.querySelectorAll(
      "#player-inputs input",
    ) as NodeListOf<HTMLInputElement>;

    let allValid = true;
    const aliases = new Map<string, HTMLInputElement[]>();

    inputs.forEach((input) => {
      const alias = input.value.trim();

      if (!alias) {
        allValid = false;
        return; // This is fine in forEach
      }

      const key = alias.toLowerCase();
      if (!aliases.has(key)) {
        aliases.set(key, []);
      }
      const aliasArray = aliases.get(key);
      if (aliasArray) {
        aliasArray.push(input);
      }
    });

    aliases.forEach((inputList) => {
      if (inputList.length > 1) {
        allValid = false;
        inputList.forEach((input) => {
          input.classList.add("border-red-500");
        });
      } else {
        const [singleInput] = inputList;
        singleInput?.classList.remove("border-red-500");
      }
    });

    startbtn.disabled = !allValid;
  }

  private showTournamentSetup(): void {
    document.getElementById("tournament-setup")?.classList.remove("hidden");
    document.getElementById("player-registration")?.classList.add("hidden");
    this.tournament = null;
  }

  private startTournament(): void {
    if (!this.tournament) return;

    const inputs = document.querySelectorAll(
      "#player-inputs input",
    ) as NodeListOf<HTMLInputElement>;

    inputs.forEach((input) => {
      const player: TournamentPlayer = {
        id: this.generateId(),
        alias: input.value.trim(),
        isEliminated: false,
        wins: 0,
        losses: 0,
        isAI: false,
      };
      if (this.tournament) {
        this.tournament.players.push(player);
      }
    });

    this.generateMatches();

    this.tournament.status = "in_progress";

    console.log("Tournament started:", this.tournament);
    this.onTournamentStart?.(this.tournament);
  }

  private generateMatches(): void {
    if (!this.tournament) return;

    const players = [...this.tournament.players];
    let matchId = 1;

    for (let i = 0; i < players.length; i += 2) {
      const firstPlayer = players[i];
      const secondPlayer = players[i + 1];
      if (firstPlayer && secondPlayer) {
        const match: Match = {
          id: `match-${matchId++}`,
          tournamentId: this.tournament.id,
          round: 1,
          player1Id: firstPlayer.id,
          player2Id: secondPlayer.id,
          status: "pending" as const,
        };
        this.tournament.matches.push(match);
      }
    }
  }

  private generateId(): string {
    return crypto.randomUUID();
  }

  public setOnTournamentStart(
    callback: (tournament: Tournament) => void,
  ): void {
    this.onTournamentStart = callback;
  }
}
