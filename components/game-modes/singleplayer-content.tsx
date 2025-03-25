"use client"

import * as React from "react"
import { Quote, Edit, Image, User } from "lucide-react"

interface SingleplayerContentProps {
  activeMode: string
}

export function SingleplayerContent({ activeMode }: SingleplayerContentProps) {
  const renderContent = () => {
    const GameCard = ({
      image,
      title,
      difficulty,
      estimated,
      completion,
    }: {
      image: string
      title: string
      difficulty: string
      estimated: string
      completion: string
    }) => (
      <div className="flex-shrink-0 w-64 bg-card rounded-lg shadow-md p-4">
        <img
          src={image}
          alt={title}
          className="w-full h-32 object-cover rounded-md mb-4"
        />
        <h3 className="font-semibold mb-2">{title}</h3>
        <div className="text-sm text-muted-foreground mb-2">
          <p>🎯 Difficulty: {difficulty}</p>
          <p>⏱ Estimated playtime: {estimated}</p>
          <p>📊 Completion time: {completion}</p>
        </div>
        <button className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90">
          Oyna
        </button>
      </div>
    )

    const renderGameCards = () => (
      <div className="overflow-x-auto">
        <div className="flex gap-4">
          <GameCard
            image="/games/rdr2.jpg"
            title="Red Dead Redemption 2"
            difficulty="Medium"
            estimated="20 min"
            completion="Easy 15 min / Hard 30 min"
          />
          <GameCard
            image="/games/witcher3.jpg"
            title="The Witcher 3"
            difficulty="Hard"
            estimated="30 min"
            completion="Easy 25 min / Hard 45 min"
          />
          {/* Diğer kartlar buraya eklenebilir */}
        </div>
      </div>
    )

    switch (activeMode) {
      case "PickAQuote":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">PickAQuote</h2>
            <p>Pick the right quote .... to win. Games listed below.</p>
            {renderGameCards()}
          </div>
        )
      case "CompletionQuote":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">CompletionQuote</h2>
            {renderGameCards()}
          </div>
        )
      case "SceneQuote":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">SceneQuote</h2>
            {renderGameCards()}
          </div>
        )
      case "WhoseQuote":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">WhoseQuote</h2>
            {renderGameCards()}
          </div>
        )
      default:
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold">Singleplayer Modları</h2>
            <p className="text-muted-foreground mt-2">Lütfen bir mod seçin</p>
          </div>
        )
    }
  }

  return <div className="h-full overflow-y-auto">{renderContent()}</div>
}
