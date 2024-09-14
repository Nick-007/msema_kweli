import React from 'react';
import styles from './hero.module.css'; // Import the CSS module

const Hero: React.FC = () => {
  return (
    <section className={styles.heroContainer}>
      {/* Image placed above the text */}
      <img src="/Whistle Blower.webp" alt="Hero" className={styles.heroImage} />
      <div className={styles.heroContent}>
        <h1>Welcome to Msema Kweli KE</h1>
        <p>
          Keeping Governments accountable.
        </p>
        <a href="/start" className={styles.btn} target='_blank'>Start</a>
      </div>
    </section>
  );
};

export default Hero;
