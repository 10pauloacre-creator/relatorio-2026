from pathlib import Path


path = Path("herminio.html")
text = path.read_text(encoding="utf-8")

text = text.replace("1&ordf; S&eacute;rie &middot; L&iacute;ngua Inglesa &mdash; 4h15", "1&ordf; S&eacute;rie &middot; Arte &mdash; 4h15", 1)
text = text.replace("1&ordf; S&eacute;rie &mdash; L&iacute;ngua Inglesa (07:00&ndash;09:00)", "1&ordf; S&eacute;rie &mdash; Arte (07:00&ndash;09:00)", 1)
text = text.replace("1&ordf; S&eacute;rie &mdash; L&iacute;ngua Inglesa (09:15&ndash;11:30)", "1&ordf; S&eacute;rie &mdash; Arte (09:15&ndash;11:30)", 1)
text = text.replace("""<div class="ed">L&iacute;ngua Inglesa &mdash; 2h/aula</div>       <div class="ec">         <span class="ch ch-h">&#9200; 07:00&ndash;09:00</span>""", """<div class="ed">Arte &mdash; 2h/aula</div>       <div class="ec">         <span class="ch ch-h">&#9200; 07:00&ndash;09:00</span>""", 1)
text = text.replace("""<div class="ed">L&iacute;ngua Inglesa &mdash; 2h15</div>       <div class="ec">         <span class="ch ch-h">&#9200; 09:15&ndash;11:30</span>""", """<div class="ed">Arte &mdash; 2h15</div>       <div class="ec">         <span class="ch ch-h">&#9200; 09:15&ndash;11:30</span>""", 1)

path.write_text(text, encoding="utf-8")
print("ok")
