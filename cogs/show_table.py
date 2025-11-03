# cogs/cmd_show_table.py
import discord
from discord import app_commands
from discord.ext import commands
from utils.data_manager import load_data
from tabulate import tabulate # Importante não esquecer disto

@app_commands.command(name="show_table", description="Mostra a tabela de um torneio (padrão: ativo)")
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

async def setup(bot: commands.Bot):
    bot.tree.add_command(show_table)