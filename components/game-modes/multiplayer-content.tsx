"use client"

import * as React from "react"
import { Quote, Edit, Image, User } from "lucide-react"

interface MultiplayerContentProps {
  activeMode: string
}
/*

i added modes as cases in switch statement
it can be improved by adding a new component for each mode
game details can be added to the top of the card list
the cards' images in the public/games folder


*/
export function MultiplayerContent({ activeMode }: MultiplayerContentProps) {
  const renderContent = () => {
    switch (activeMode) {
      case "PickAQuote":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Multiplayer PickAQuote</h2>
            <p>
              Pick the right quote .... to win. Games listed below.
            </p>
            <div className="overflow-x-auto">
              <div className="flex gap-4">
                {/* Örnek kartlar */}
                <div className="flex-shrink-0 w-64 bg-card rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img src="/games/rdr2.jpg" alt="RDR2" className="w-full h-32 object-cover rounded-md mb-4" />
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs">
                      2/4 Oyuncu
                    </div>
                  </div>
                  <h3 className="font-semibold mb-2">Red Dead Redemption 2</h3>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90">
                      Katıl
                    </button>
                    <button className="flex-1 bg-secondary text-secondary-foreground py-2 rounded-md hover:bg-secondary/90">
                      İzle
                    </button>
                  </div>
                </div>
                <div className="flex-shrink-0 w-64 bg-card rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img src="/games/witcher3.jpg" alt="The Witcher 3" className="w-full h-32 object-cover rounded-md mb-4" />
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs">
                      1/4 Oyuncu
                    </div>
                  </div>
                  <h3 className="font-semibold mb-2">The Witcher 3</h3>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90">
                      Katıl
                    </button>
                    <button className="flex-1 bg-secondary text-secondary-foreground py-2 rounded-md hover:bg-secondary/90">
                      İzle
                    </button>
                  </div>
                </div>
                {/* Diğer kartlar buraya eklenecek */}
              </div>
            </div>
          </div>
        )
      case "CompletionQuote":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Multiplayer CompletionQuote</h2>
            <div className="overflow-x-auto">
              <div className="flex gap-4">
                {/* Örnek kartlar */}
                <div className="flex-shrink-0 w-64 bg-card rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img src="/games/rdr2.jpg" alt="RDR2" className="w-full h-32 object-cover rounded-md mb-4" />
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs">
                      3/4 Oyuncu
                    </div>
                  </div>
                  <h3 className="font-semibold mb-2">Red Dead Redemption 2</h3>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90">
                      Katıl
                    </button>
                    <button className="flex-1 bg-secondary text-secondary-foreground py-2 rounded-md hover:bg-secondary/90">
                      İzle
                    </button>
                  </div>
                </div>
                <div className="flex-shrink-0 w-64 bg-card rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img src="/games/witcher3.jpg" alt="The Witcher 3" className="w-full h-32 object-cover rounded-md mb-4" />
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs">
                      2/4 Oyuncu
                    </div>
                  </div>
                  <h3 className="font-semibold mb-2">The Witcher 3</h3>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90">
                      Katıl
                    </button>
                    <button className="flex-1 bg-secondary text-secondary-foreground py-2 rounded-md hover:bg-secondary/90">
                      İzle
                    </button>
                  </div>
                </div>
                {/* Diğer kartlar buraya eklenecek */}
              </div>
            </div>
          </div>
        )
      case "SceneQuote":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Multiplayer SceneQuote</h2>
            <div className="overflow-x-auto">
              <div className="flex gap-4">
                {/* Örnek kartlar */}
                <div className="flex-shrink-0 w-64 bg-card rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img src="/games/rdr2.jpg" alt="RDR2" className="w-full h-32 object-cover rounded-md mb-4" />
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs">
                      4/4 Oyuncu
                    </div>
                  </div>
                  <h3 className="font-semibold mb-2">Red Dead Redemption 2</h3>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90">
                      Katıl
                    </button>
                    <button className="flex-1 bg-secondary text-secondary-foreground py-2 rounded-md hover:bg-secondary/90">
                      İzle
                    </button>
                  </div>
                </div>
                <div className="flex-shrink-0 w-64 bg-card rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img src="/games/witcher3.jpg" alt="The Witcher 3" className="w-full h-32 object-cover rounded-md mb-4" />
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs">
                      3/4 Oyuncu
                    </div>
                  </div>
                  <h3 className="font-semibold mb-2">The Witcher 3</h3>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90">
                      Katıl
                    </button>
                    <button className="flex-1 bg-secondary text-secondary-foreground py-2 rounded-md hover:bg-secondary/90">
                      İzle
                    </button>
                  </div>
                </div>
                {/* Diğer kartlar buraya eklenecek */}
              </div>
            </div>
          </div>
        )
      case "WhoseQuote":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Multiplayer WhoseQuote</h2>
            <div className="overflow-x-auto">
              <div className="flex gap-4">
                {/* Örnek kartlar */}
                <div className="flex-shrink-0 w-64 bg-card rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img src="/games/rdr2.jpg" alt="RDR2" className="w-full h-32 object-cover rounded-md mb-4" />
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs">
                      2/4 Oyuncu
                    </div>
                  </div>
                  <h3 className="font-semibold mb-2">Red Dead Redemption 2</h3>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90">
                      Katıl
                    </button>
                    <button className="flex-1 bg-secondary text-secondary-foreground py-2 rounded-md hover:bg-secondary/90">
                      İzle
                    </button>
                  </div>
                </div>
                <div className="flex-shrink-0 w-64 bg-card rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img src="/games/witcher3.jpg" alt="The Witcher 3" className="w-full h-32 object-cover rounded-md mb-4" />
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs">
                      1/4 Oyuncu
                    </div>
                  </div>
                  <h3 className="font-semibold mb-2">The Witcher 3</h3>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90">
                      Katıl
                    </button>
                    <button className="flex-1 bg-secondary text-secondary-foreground py-2 rounded-md hover:bg-secondary/90">
                      İzle
                    </button>
                  </div>
                </div>
                {/* Diğer kartlar buraya eklenecek */}
              </div>
            </div>
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