import React, { useState, useEffect } from 'react';
import { IonSpinner } from '@ionic/react';
import './WeatherSummary.css';

interface WeatherData {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
}

interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
}

const WeatherSummary: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Weather code to OpenWeather icon mapping based on WMO Weather interpretation codes
  const getWeatherIconUrl = (code: number): string => {
    const baseUrl = 'https://openweathermap.org/img/wn/';
    const size = '@2x.png';
    
    // Determine if it's day or night (simplified - using current hour)
    const currentHour = new Date().getHours();
    const isDaytime = currentHour >= 6 && currentHour < 18;
    
    let iconCode = '01d'; // Default to clear sky day
    
    if (code === 0) {
      // Clear sky
      iconCode = isDaytime ? '01d' : '01n';
    } else if (code === 1) {
      // Mainly clear
      iconCode = isDaytime ? '02d' : '02n';
    } else if (code === 2) {
      // Partly cloudy
      iconCode = isDaytime ? '03d' : '03n';
    } else if (code === 3) {
      // Overcast
      iconCode = isDaytime ? '04d' : '04n';
    } else if (code >= 45 && code <= 48) {
      // Fog and depositing rime fog
      iconCode = isDaytime ? '50d' : '50n';
    } else if (code >= 51 && code <= 57) {
      // Drizzle: Light, moderate, and dense intensity
      iconCode = isDaytime ? '09d' : '09n';
    } else if (code >= 61 && code <= 67) {
      // Rain: Slight, moderate and heavy intensity
      iconCode = isDaytime ? '10d' : '10n';
    } else if (code >= 71 && code <= 77) {
      // Snow fall: Slight, moderate, and heavy intensity
      iconCode = isDaytime ? '13d' : '13n';
    } else if (code >= 80 && code <= 82) {
      // Rain showers: Slight, moderate, and violent
      iconCode = isDaytime ? '09d' : '09n';
    } else if (code >= 85 && code <= 86) {
      // Snow showers slight and heavy
      iconCode = isDaytime ? '13d' : '13n';
    } else if (code === 95) {
      // Thunderstorm: Slight or moderate
      iconCode = isDaytime ? '11d' : '11n';
    } else if (code >= 96 && code <= 99) {
      // Thunderstorm with slight and heavy hail
      iconCode = isDaytime ? '11d' : '11n';
    }
    
    return `${baseUrl}${iconCode}${size}`;
  };


  // Fixed location for Reading, UK
  const getReadingLocation = (): LocationData => {
    return { 
      latitude: 51.4543, 
      longitude: -0.9781, 
      city: 'Reading, UK' 
    };
  };

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }
      
      const data = await response.json();
      setWeather(data);
    } catch (err) {
      setError('Unable to fetch weather data');
      console.error('Weather fetch error:', err);
    }
  };

  const getCurrentDate = (): string => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    };
    return today.toLocaleDateString('en-GB', options);
  };

  useEffect(() => {
    const initializeWeather = async () => {
      try {
        const locationData = getReadingLocation();
        await fetchWeather(locationData.latitude, locationData.longitude);
      } catch (err) {
        setError('Unable to fetch weather data');
        console.error('Weather initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeWeather();
  }, []);

  if (loading) {
    return (
      <div className="weather-compact">
        <IonSpinner name="dots" />
        <span>Loading weather...</span>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="weather-compact weather-error">
        <span>{error || 'Weather unavailable'}</span>
      </div>
    );
  }

  const { current } = weather;
  const weatherIconUrl = getWeatherIconUrl(current.weather_code);
  const currentDate = getCurrentDate();

  return (
    <div className="weather-compact">
      <span className="weather-date">{currentDate}</span>
      <img 
        src={weatherIconUrl} 
        alt="Weather icon" 
        className="weather-icon-compact"
      />
      <span className="weather-temp">{Math.round(current.temperature_2m)}°</span>
    </div>
  );
};

export default WeatherSummary;
