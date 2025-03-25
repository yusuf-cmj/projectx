"use client"

import * as React from "react"
import { Quote, Edit, Image, User } from "lucide-react"

interface MultiplayerContentProps {
  activeMode: string
}

export function MultiplayerContent({ activeMode }: MultiplayerContentProps) {
  const MultiplayerGameCard = ({
    image,
    title,
    players,
    difficulty,
    estimated,
    completion,
  }: {
    image: string
    title: string
    players: string
    difficulty: string
    estimated: string
    completion: string
  }) => (
    <div className="flex-shrink-0 w-64 bg-card rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      <div className="relative">
        <img
          src={image}
          alt={title}
          className="w-full h-32 object-cover rounded-md mb-4"
        />
        <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs">
          {players} Oyuncu
        </div>
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <div className="text-sm text-muted-foreground mb-2">
        <p>🎯 Difficulty: {difficulty}</p>
        <p>⏱ Estimated playtime: {estimated}</p>
        <p>📊 Completion time: {completion}</p>
      </div>
      <div className="flex gap-2">
        <button className="flex-1 bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90">
          Katıl
        </button>
        <button className="flex-1 bg-secondary text-secondary-foreground py-2 rounded-md hover:bg-secondary/90">
          İzle
        </button>
      </div>
    </div>
  );

  const renderMultiplayerCards = (playerCounts: string[]) => (
    <div className="overflow-x-auto">
      <div className="flex gap-4">
        <MultiplayerGameCard
          image="/games/rdr2.jpg"
          title="Red Dead Redemption 2"
          players={playerCounts[0]}
          difficulty="Medium"
          estimated="20 min"
          completion="Easy 15 min / Hard 30 min"
        />
        <MultiplayerGameCard
          image="/games/witcher3.jpg"
          title="The Witcher 3"
          players={playerCounts[1]}
          difficulty="Hard"
          estimated="30 min"
          completion="Easy 25 min / Hard 45 min"
        />
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeMode) {
      case "PickAQuote":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Multiplayer PickAQuote</h2>
            <p>Pick the right quote .... to win. Games listed below.</p>
            {renderMultiplayerCards(["2/4", "1/4"])}
          </div>
        )
      case "CompletionQuote":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Multiplayer CompletionQuote</h2>
            {renderMultiplayerCards(["3/4", "2/4"])}
          </div>
        )
      case "SceneQuote":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Multiplayer SceneQuote</h2>
            {renderMultiplayerCards(["4/4", "3/4"])}
          </div>
        )
      case "WhoseQuote":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Multiplayer WhoseQuote</h2>
            {renderMultiplayerCards(["2/4", "1/4"])}
          </div>
        )
      default:
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold">Multiplayer Modları</h2>
            <p className="text-muted-foreground mt-2">Lütfen bir mod seçin</p>
          </div>
        )
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      {renderContent()}
    </div>
  )
}
