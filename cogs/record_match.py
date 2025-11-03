# cogs/cmd_record_match.py
import discord
from discord import app_commands
from discord.ext import commands
from utils.data_manager import load_data, save_data

@app_commands.command(name="record_match", description="Registra o resultado entre dois jogadores em um torneio")
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

async def setup(bot: commands.Bot):
    bot.tree.add_command(record_match)