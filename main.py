# main.py
import discord
from discord import app_commands
import json
import os
from tabulate import tabulate
from dotenv import load_dotenv


load_dotenv()

TOKEN = os.getenv("DISCORD_TOKEN")        
GUILD_ID = None                  
DATA_FILE = "tournaments.json"



def load_data():
    if not os.path.exists(DATA_FILE):
        return {"active": None, "tournaments": {}}
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


class MeuPrimeiroBot(discord.Client):
    def __init__(self):
        intents = discord.Intents.default()
        super().__init__(intents=intents)
        self.tree = app_commands.CommandTree(self)

    async def setup_hook(self):
        if GUILD_ID:
            guild = discord.Object(id=GUILD_ID)
            self.tree.copy_global_to(guild=guild)
            await self.tree.sync(guild=guild)
        else:
            await self.tree.sync()

    async def on_ready(self):
        print(f" Bot online: {self.user} (ready)")


bot = MeuPrimeiroBot()



@bot.tree.command(name="new_tournament", description="Cria um novo torneio e o torna ativo")
@app_commands.choices(tipo=[
    app_commands.Choice(name="Pontos Corridos", value="pontos_corridos"),
    app_commands.Choice(name="Fase de Grupos", value="fase_de_grupos"),
    app_commands.Choice(name="Suíço", value="suico"),
    app_commands.Choice(name="Mata-mata", value="mata_mata"),
])
async def new_tournament(interaction: discord.Interaction, name: str, tipo: app_commands.Choice[str]):
    data = load_data()
    if name in data["tournaments"]:
        await interaction.response.send_message(" Já existe um torneio com esse nome.", ephemeral=True)
        return

    data["tournaments"][name] = {
        "type": tipo.value,
        "players": {},
        "matches": []
    }
    data["active"] = name
    save_data(data)
    await interaction.response.send_message(f" Torneio **{name}** criado e definido como ativo (tipo: {tipo.name}).")



@bot.tree.command(name="list_tournaments", description="Lista todos os torneios criados")
async def list_tournaments(interaction: discord.Interaction):
    data = load_data()
    tournaments = data.get("tournaments", {})
    if not tournaments:
        await interaction.response.send_message(" Nenhum torneio criado ainda.", ephemeral=True)
        return

    active = data.get("active")
    text = "\n".join(
        f"• {name} {'(ativo)' if name == active else ''}" for name in tournaments.keys()
    )
    await interaction.response.send_message(f" Torneios:\n{text}")



@bot.tree.command(name="set_active", description="Define qual torneio será usado como ativo")
async def set_active(interaction: discord.Interaction, name: str):
    data = load_data()
    if name not in data["tournaments"]:
        await interaction.response.send_message(" Não existe torneio com esse nome.", ephemeral=True)
        return

    data["active"] = name
    save_data(data)
    await interaction.response.send_message(f" O torneio ativo agora é **{name}**.")



@bot.tree.command(name="add_player", description="Adiciona um jogador a um torneio (padrão: ativo)")
async def add_player(interaction: discord.Interaction, nome: str, torneio: str = None):
    data = load_data()
    active = torneio or data.get("active")
    if not active:
        await interaction.response.send_message(" Não há torneio ativo nem foi especificado um.", ephemeral=True)
        return

    if active not in data["tournaments"]:
        await interaction.response.send_message(" Esse torneio não existe.", ephemeral=True)
        return

    players = data["tournaments"][active]["players"]
    if nome in players:
        await interaction.response.send_message(" Jogador já cadastrado.", ephemeral=True)
        return

    players[nome] = {"wins": 0, "losses": 0, "draws": 0, "played": 0, "points": 0}
    save_data(data)
    await interaction.response.send_message(f" Jogador **{nome}** adicionado ao torneio **{active}**.")




@bot.tree.command(name="record_match", description="Registra o resultado entre dois jogadores em um torneio")
@app_commands.choices(resultado=[
    app_commands.Choice(name="Vitória jogador1", value="1"),
    app_commands.Choice(name="Vitória jogador2", value="2"),
    app_commands.Choice(name="Empate", value="draw"),
])
async def record_match(interaction: discord.Interaction, player1: str, player2: str, resultado: app_commands.Choice[str], torneio: str = None):
    data = load_data()
    active = torneio or data.get("active")
    if not active:
        await interaction.response.send_message(" Não há torneio ativo nem foi especificado um.", ephemeral=True)
        return

    if active not in data["tournaments"]:
        await interaction.response.send_message(" Esse torneio não existe.", ephemeral=True)
        return

    tour = data["tournaments"][active]
    players = tour["players"]
    if player1 not in players or player2 not in players:
        await interaction.response.send_message(" Ambos os jogadores precisam estar cadastrados no torneio.", ephemeral=True)
        return

    p1 = players[player1]
    p2 = players[player2]
    p1["played"] += 1
    p2["played"] += 1

    if resultado.value == "1":
        p1["wins"] += 1
        p2["losses"] += 1
        p1["points"] += 3
    elif resultado.value == "2":
        p2["wins"] += 1
        p1["losses"] += 1
        p2["points"] += 3
    else:
        p1["draws"] += 1
        p2["draws"] += 1
        p1["points"] += 1
        p2["points"] += 1

    tour["matches"].append({"p1": player1, "p2": player2, "result": resultado.value})
    save_data(data)
    await interaction.response.send_message(f" Resultado registrado em **{active}**: **{player1}** vs **{player2}** → {resultado.name}")




@bot.tree.command(name="show_table", description="Mostra a tabela de um torneio (padrão: ativo)")
async def show_table(interaction: discord.Interaction, name: str = None):
    data = load_data()
    active = name or data.get("active")
    if not active:
        await interaction.response.send_message(" Não há torneio ativo nem nome especificado.", ephemeral=True)
        return

    if active not in data["tournaments"]:
        await interaction.response.send_message(" Esse torneio não existe.", ephemeral=True)
        return

    tour = data["tournaments"][active]
    players = tour["players"]

    if not players:
        await interaction.response.send_message(f" O torneio **{active}** ainda não tem jogadores.", ephemeral=True)
        return

    rows = []
    for nome, st in players.items():
        played = st["played"]
        wins = st["wins"]
        draws = st["draws"]
        losses = st["losses"]
        points = st["points"]
        win_pct = (wins / played * 100) if played > 0 else 0.0
        ponderada = ((wins + 0.5 * draws) / played * 100) if played > 0 else 0.0
        rows.append((nome, played, wins, draws, losses, points, win_pct, ponderada))

    rows.sort(key=lambda r: (-r[5], -r[2], -r[6]))

    headers = ["Pos", "Jogador", "J", "V", "E", "D", "Pts", "Win %", "Win % Ponderada"]
    table = [
        [idx, r[0], r[1], r[2], r[3], r[4], r[5], f"{r[6]:.2f}%", f"{r[7]:.2f}%"]
        for idx, r in enumerate(rows, start=1)
    ]

    text = tabulate(table, headers=headers, tablefmt="pretty")
    await interaction.response.send_message(f"**Tabela: {active}**\n```{text}```")



if __name__ == "__main__":
    bot.run(TOKEN)
