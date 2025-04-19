"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Gamepad, Users } from "lucide-react"

export default function HomeTabs() {
  return (
    <Tabs defaultValue="singleplayer" className="w-full max-w-md">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="singleplayer">
            <Gamepad className="mr-2 h-4 w-4"/> Singleplayer
        </TabsTrigger>
        <TabsTrigger value="multiplayer">
            <Users className="mr-2 h-4 w-4"/> Multiplayer
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="singleplayer">
        <Card className="hover:shadow-xl transition duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Gamepad className="h-5 w-5"/>
                Singleplayer Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
                <p className="text-sm text-muted-foreground mb-1">
                    Play a solo quiz with random quotes.
                </p>
                <Button variant="default" size="lg" className="w-full">Play</Button>
            </div>
            <div>
                <p className="text-sm text-muted-foreground mb-1">
                    Check your game history and scores.
                </p>
                <Button variant="outline" size="lg" className="w-full">History</Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="multiplayer">
        <Card className="hover:shadow-x1 transition duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Multiplayer Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
                <p className="text-sm text-muted-foreground mb-1">
                    Join a room and compete with others.
                </p>
                <Button variant="default" size="lg" className="w-full">Join</Button>
            </div>
            <div>
                <p className="text-sm text-muted-foreground mb-1">
                    Create a custom room to play with friends.
                </p>    
                <Button variant="outline" size="lg" className="w-full">Create</Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
