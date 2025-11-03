# cogs/cog_set_active.py
import discord
from discord import app_commands
from discord.ext import commands
from utils.data_manager import load_data, save_data

@app_commands.command(name="set_active", description="Define qual torneio será usado como ativo")
async def set_active(self, interaction: discord.Interaction, name: str):
        data = load_data()
        if name not in data["tournaments"]:
            await interaction.response.send_message(" Não existe torneio com esse nome.", ephemeral=True)
            return

        data["active"] = name
        save_data(data)
        await interaction.response.send_message(f" O torneio ativo agora é **{name}**.")

async def setup(bot: commands.Bot):
    await bot.add_cog(SetActiveCog(bot))