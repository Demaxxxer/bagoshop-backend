class Slider {
  $ = document.querySelector.bind(document);

  constructor(wrapperId,minId,maxId) {

    $('#range-min').addEventListener('mousedown', e => {
      window.addEventListener("mousemove", moveMin);
      window.addEventListener("mouseup", e => {
        window.removeEventListener("mousemove", moveMin)
      });
    })


    this.wrapper = $(wrapperId);
    this.minThumb = $(minId);
    this.maxThumb = $(maxId);
    this.pos = this.wrapper.getBoundingClientRect()
    this.max = this.wrapper.getAttribute('max');
    this.min = this.wrapper.getAttribute('min');

  }

  preCreate(width,height){



  }


}
