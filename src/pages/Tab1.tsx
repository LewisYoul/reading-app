import { IonContent, IonPage } from '@ionic/react';
import './Tab1.css';
import WelcomeHeader from '../components/WelcomeHeader';
import WeatherSummary from '../components/WeatherSummary';
import Bin from '../components/Bin';

const Tab1: React.FC = () => {
  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="page-content">
          <WelcomeHeader />
          <WeatherSummary />
          
          <Bin />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Tab1;
