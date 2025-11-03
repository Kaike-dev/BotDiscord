# cogs/cmd_list_tournaments.py
import discord
from discord import app_commands
from discord.ext import commands
from utils.data_manager import load_data

@app_commands.command(name="list_tournaments", description="Lista todos os torneios criados")
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

async def setup(bot: commands.Bot):
    bot.tree.add_command(list_tournaments)