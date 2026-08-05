import Header from './components/Header'
import Hero from './components/Hero'
import Services from './components/Services'
import Audience from './components/Audience'
import WhyUs from './components/WhyUs'
import Testimonials from './components/Testimonials'
import FAQ from './components/FAQ'
import ContactForm from './components/ContactForm'
import Footer from './components/Footer'

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Services />
        <Audience />
        <WhyUs />
        <Testimonials />
        <FAQ />
        <ContactForm />
      </main>
      <Footer />
    </>
  )
}
