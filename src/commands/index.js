import * as addPlayer from "./add-player.js";
import * as listTournaments from "./list-tournaments.js";
import * as newTournament from "./new-tournament.js";
import * as recordMatch from "./record-match.js";
import * as setActive from "./set-active.js";
import * as showTable from "./show-table.js";

export const commands = [
  newTournament,
  addPlayer,
  recordMatch,
  setActive,
  listTournaments,
  showTable,
];

export const commandMap = new Map(commands.map((command) => [command.data.name, command]));
