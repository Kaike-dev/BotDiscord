# cogs/cmd_add_player.py
import discord
from discord import app_commands
from discord.ext import commands
from utils.data_manager import load_data, save_data

@app_commands.command(name="add_player", description="Adiciona um jogador a um torneio (padrão: ativo)")
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

async def setup(bot: commands.Bot):
    bot.tree.add_command(add_player)