"use client"

import * as React from "react"
import { Quote, Edit, Image, User } from "lucide-react"

interface SingleplayerContentProps {
  activeMode: string
}
/*

i added modes as cases in switch statement
it can be improved by adding a new component for each mode
game details can be added to the top of the card list
the cards' images in the public/games folder


*/
export function SingleplayerContent({ activeMode }: SingleplayerContentProps) {
  const renderContent = () => {
    switch (activeMode) {
      case "PickAQuote":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">PickAQuote</h2>
            <p>
              Pick the right quote .... to win. Games listed below.
            </p>
            <div className="overflow-x-auto">
              <div className="flex gap-4">
                {/* Örnek kartlar */}
                <div className="flex-shrink-0 w-64 bg-card rounded-lg shadow-md p-4">
                  <img src="/games/rdr2.jpg" alt="RDR2" className="w-full h-32 object-cover rounded-md mb-4" />
                  <h3 className="font-semibold mb-2">Red Dead Redemption 2</h3>
                  <button className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90">
                    Oyna
                  </button>
                </div>
                <div className="flex-shrink-0 w-64 bg-card rounded-lg shadow-md p-4">
                  <img src="/games/witcher3.jpg" alt="The Witcher 3" className="w-full h-32 object-cover rounded-md mb-4" />
                  <h3 className="font-semibold mb-2">The Witcher 3</h3>
                  <button className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90">
                    Oyna
                  </button>
                </div>
                {/* Diğer kartlar buraya eklenecek */}
              </div>
            </div>
          </div>
        )
      case "CompletionQuote":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">CompletionQuote</h2>
            <div className="overflow-x-auto">
              <div className="flex gap-4">
                {/* Örnek kartlar */}
                <div className="flex-shrink-0 w-64 bg-card rounded-lg shadow-md p-4">
                  <img src="/games/rdr2.jpg" alt="RDR2" className="w-full h-32 object-cover rounded-md mb-4" />
                  <h3 className="font-semibold mb-2">Red Dead Redemption 2</h3>
                  <button className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90">
                    Oyna
                  </button>
                </div>
                <div className="flex-shrink-0 w-64 bg-card rounded-lg shadow-md p-4">
                  <img src="/games/witcher3.jpg" alt="The Witcher 3" className="w-full h-32 object-cover rounded-md mb-4" />
                  <h3 className="font-semibold mb-2">The Witcher 3</h3>
                  <button className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90">
                    Oyna
                  </button>
                </div>
                {/* Diğer kartlar buraya eklenecek */}
              </div>
            </div>
          </div>
        )
      case "SceneQuote":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">SceneQuote</h2>
            <div className="overflow-x-auto">
              <div className="flex gap-4">
                {/* Örnek kartlar */}
                <div className="flex-shrink-0 w-64 bg-card rounded-lg shadow-md p-4">
                  <img src="/games/rdr2.jpg" alt="RDR2" className="w-full h-32 object-cover rounded-md mb-4" />
                  <h3 className="font-semibold mb-2">Red Dead Redemption 2</h3>
                  <button className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90">
                    Oyna
                  </button>
                </div>
                <div className="flex-shrink-0 w-64 bg-card rounded-lg shadow-md p-4">
                  <img src="/games/witcher3.jpg" alt="The Witcher 3" className="w-full h-32 object-cover rounded-md mb-4" />
                  <h3 className="font-semibold mb-2">The Witcher 3</h3>
                  <button className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90">
                    Oyna
                  </button>
                </div>
                {/* Diğer kartlar buraya eklenecek */}
              </div>
            </div>
          </div>
        )
      case "WhoseQuote":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">WhoseQuote</h2>
            <div className="overflow-x-auto">
              <div className="flex gap-4">
                {/* Örnek kartlar */}
                <div className="flex-shrink-0 w-64 bg-card rounded-lg shadow-md p-4">
                  <img src="/games/rdr2.jpg" alt="RDR2" className="w-full h-32 object-cover rounded-md mb-4" />
                  <h3 className="font-semibold mb-2">Red Dead Redemption 2</h3>
                  <button className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90">
                    Oyna
                  </button>
                </div>
                <div className="flex-shrink-0 w-64 bg-card rounded-lg shadow-md p-4">
                  <img src="/games/witcher3.jpg" alt="The Witcher 3" className="w-full h-32 object-cover rounded-md mb-4" />
                  <h3 className="font-semibold mb-2">The Witcher 3</h3>
                  <button className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90">
                    Oyna
                  </button>
                </div>
                {/* Diğer kartlar buraya eklenecek */}
              </div>
            </div>
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

  return (
    <div className="h-full overflow-y-auto">
      {renderContent()}
    </div>
  )
} 