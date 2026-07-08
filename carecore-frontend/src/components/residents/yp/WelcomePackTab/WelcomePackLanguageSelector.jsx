import { Button } from "@/components/ui/button";

export default function WelcomePackLanguageSelector({ languages, selectedLanguage, onSelectLanguage, availableLanguages = [] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {languages.map(lang => {
        const isAvailable = availableLanguages.includes(lang.id);
        const isSelected = selectedLanguage === lang.id;
        
        return (
          <Button
            key={lang.id}
            onClick={() => onSelectLanguage(lang.id)}
            variant={isSelected ? "default" : "outline"}
            className={`rounded-full px-4 transition-all ${!isAvailable && !isSelected ? "opacity-50" : ""}`}
            disabled={!isAvailable && !isSelected}
            title={!isAvailable ? "Not available in this language" : ""}
          >
            {lang.label}
            {!isAvailable && !isSelected && <span className="ml-2 text-xs">—</span>}
          </Button>
        );
      })}
    </div>
  );
}